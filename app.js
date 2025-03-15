
require('dotenv').config();

const express = require('express');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const markdown = require('nunjucks-markdown');
const marked = require('marked');
const bodyParser = require('body-parser');
const lunr = require('lunr');
const fs = require('fs');
const path = require('path');
const config = require('./app/config');
const forceHttps = require('express-force-https');
const compression = require('compression');
const routes = require('./app/routes');
const session = require('express-session');
const favicon = require('serve-favicon');
const PageIndex = require('./middleware/pageIndex');
const pageIndex = new PageIndex(config);
const NotifyClient = require('notifications-node-client').NotifyClient;
const airtable = require('airtable');
const base = new airtable({ apiKey: process.env.airtableFeedbackKey }).base(process.env.airtableFeedbackBase);
const app = express();
const axios = require('axios');
const PGStore = require('connect-pg-simple')(session);

const pool = require('./middleware/pool');

app.use(compression());

const notify = new NotifyClient(process.env.notifyKey);

async function trackSearchTerm(searchTerm) {
  const measurementId = process.env.GAProperty;
  const apiSecret = process.env.GASecret;
  const clientId = '999999.999999'; // Optional client ID

  const payload = {
    client_id: clientId, 
    events: [{
      name: 'search', 
      params: {
        search_term: searchTerm 
      }
    }]
  };

  try {
    const response = await axios.post(`https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`, payload);
    console.log('Event tracked successfully:');
  } catch (error) {
    console.error('Error tracking event:', error);
  }
}

async function trackReferrer(referrerUrl) {
  const measurementId = process.env.GAProperty;
  const apiSecret = process.env.GASecret;
  const clientId = '999999.999999'; // Optional client ID

  const payload = {
    client_id: clientId,
    events: [{
      name: 'referrer_tracking',
      params: {
        referrer_url: referrerUrl || 'No referrer' // Ensure a fallback if missing
      }
    }]
  };

  try {
    const response = await axios.post(
      `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
      payload
    );
    console.log('Referrer URL tracked successfully:', referrerUrl);
  } catch (error) {
    console.error('Error tracking referrer URL:', error);
  }
}


app.use(
  session({
    store: new PGStore({
      pool: pool,                      
      schemaName: 'accessibility_manual',
      tableName: 'sessions',            
      createTableIfMissing: false
    }),
    secret: process.env.sessionkey,
    resave: false,
    saveUninitialized: false,
    ccookie: {
      maxAge: 1000 * 60 * 60 * 24 * 365 
    }
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(favicon(path.join(__dirname, 'public/assets/images', 'favicon.ico')));

app.set('view engine', 'html');

const service = "Accessibility manual"; 

app.locals.serviceName = process.env.serviceName || service;

// Set up Nunjucks as the template engine
var nunjuckEnv = nunjucks.configure(
  [
    'app/views',
    'node_modules/govuk-frontend/dist/',
    'node_modules/dfe-frontend/packages/components',
  ],
  {
    autoescape: true,
    express: app,
  },
);

nunjuckEnv.addFilter('date', dateFilter);
markdown.register(nunjuckEnv, marked.parse);
nunjuckEnv.addFilter('formatNumber', function (number) {
  return number.toLocaleString();
});

nunjuckEnv.addFilter('hyphen', function (str) {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
});

nunjuckEnv.addFilter('slugify', function (str) {
  return str
  .toString()
  .toLowerCase()
  .trim()
  .replace(/\s+/g, '-')   // Replace spaces with -
  .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
  .replace(/\-\-+/g, '-');  // Replace multiple - with single -
});

app.use(forceHttps);

console.log('Start page indexing')


// Set up static file serving for the app's assets
app.use('/assets', express.static('public/assets'))

app.use((req, res, next) => {
  if (req.url.endsWith('/') && req.url.length > 1) {
    const canonicalUrl = req.url.slice(0, -1)
    res.set('Link', `<${canonicalUrl}>; rel="canonical"`)
  }
  next()
})

app.use('/', routes)

app.use(async (req, res, next) => {
  const referrer = req.get('Referer') || 'No referrer';

  if (referrer !== 'No referrer') {
    await trackReferrer(referrer); // Send to GA4
  }

  next();
});


// Render sitemap.xml in XML format
app.get('/sitemap.xml', (_, res) => {
  res.set({ 'Content-Type': 'application/xml' });
  res.render('sitemap.xml')
})


app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename

  if (!/^[a-zA-Z0-9-_]+\.(docx|pdf|xlsx)$/.test(filename)) {
    return res.status(400).send('Invalid file name')
  }

  const filePath = path.join(__dirname, 'app/assets/downloads', filename)

  if (!filePath.startsWith(path.join(__dirname, 'app/assets/downloads'))) {
    return res.status(400).send('Invalid file path')
  }
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

  // Send the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('File send error:', err)
      res.status(500).send('Server error')
    }
  })
})

app.get('/search', (req, res) => {
  console.log(req.query['searchterm']);
  const query = req.query['searchterm'] || '';
  const resultsPerPage = 10;
  let currentPage = parseInt(req.query.page, 10);
  const results = pageIndex.search(query);
  console.log('Results: ' + results);
  console.log('Query: ' + query);

  trackSearchTerm(query);

  const maxPage = Math.ceil(results.length / resultsPerPage);
  if (!Number.isInteger(currentPage)) {
    currentPage = 1;
  } else if (currentPage > maxPage || currentPage < 1) {
    currentPage = 1;
  }

  const startingIndex = resultsPerPage * (currentPage - 1);
  const endingIndex = startingIndex + resultsPerPage;

  res.render('search.html', {
    currentPage,
    maxPage,
    query,
    results: results.slice(startingIndex, endingIndex),
    resultsLen: results.length,
  });
});

if (config.env !== 'development') {
  setTimeout(() => {
    pageIndex.init()
  }, 2000)
}


// Route for handling Yes/No feedback submissions
app.post('/form-response/helpful', (req, res) => {
  const { response } = req.body;
  const pageURL = req.headers.referer || 'Unknown';
  const date = new Date().toISOString();

  base('Data').create([
    {
      "fields": {
        "Response": response,
        "Service": service,
        "URL": pageURL
      }
    }
  ], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saving to Airtable');
    }
    res.json({ success: true, message: 'Feedback submitted successfully' });
  });
});

// New route for handling detailed feedback submissions
app.post('/form-response/feedback', (req, res) => {
  const { response } = req.body;

 // Example service name
  const pageURL = req.headers.referer || 'Unknown'; // Attempt to capture the referrer URL
  const date = new Date().toISOString();

  base('Feedback').create([{
    "fields": {
      "Feedback": response,
      "Service": service,
      "URL": pageURL
    }
  }], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).send('Error saving to Airtable');
    }
    res.json({ success: true, message: 'Feedback submitted successfully' });
  });
});


// Your custom middleware to automatically save form data to session
function saveFormDataToSession(req, res, next) {
  if (req.method === 'POST') {
    req.session.data = {
      ...req.session.data, // Existing session data
      ...req.body, // New form data
    };
  }
  next();
}

// Middleware to make formData globally available to all views
function makeFormDataGlobal(req, res, next) {
  // Perform a shallow merge of existing res.locals.data and session data
  res.locals.data = {
    ...res.locals.data, // Existing data
    ...req.session.data, // Data from the session
  };
  next();
}

// Register the middlewares globally
app.use(saveFormDataToSession);
app.use(makeFormDataGlobal);

app.post('/submit-feedback', (req, res) => {
  const feedback = req.body.feedback_form_input;
  const fullUrl = req.headers.referer || 'Unknown';

  //Send to notify after validation with recaptcha first
  //TODO: Implement recaptcha

  notify
    .sendEmail(process.env.feedbackTemplateID, 'design.ops@education.gov.uk', {
      personalisation: {
        feedback: feedback,
        page: fullUrl,
        service: 'Accessibility Manual',
      },
    })
    .then((response) => { })
    .catch((err) => console.log(err));

  return res.sendStatus(200);
});


app.get(/\.html?$/i, function (req, res) {
  var path = req.path;
  var parts = path.split('.');
  parts.pop();
  path = parts.join('.');
  res.redirect(path);
});

app.get(/^([^.]+)$/, function (req, res, next) {
  matchRoutes(req, res, next);
});

// Handle 404 errors
app.use(function (req, res, next) {
  res.status(404).render('error.html');
});

// Handle 500 errors
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('error.html');
});

// Try to match a request to a template, for example a request for /test
// would look for /app/views/test.html
// and /app/views/test/index.html

function renderPath(path, res, next) {
  // Try to render the path
  res.render(path, function (error, html) {
    if (!error) {
      // Success - send the response
      res.set({ 'Content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (!error.message.startsWith('template not found')) {
      // We got an error other than template not found - call next with the error
      next(error);
      return;
    }
    if (!path.endsWith('/index')) {
      // Maybe it's a folder - try to render [path]/index.html
      renderPath(path + '/index', res, next);
      return;
    }
    // We got template not found both times - call next to trigger the 404 page
    next();
  });
}

matchRoutes = function (req, res, next) {
  var path = req.path;

  // Remove the first slash, render won't work with it
  path = path.substr(1);

  // If it's blank, render the root index
  if (path === '') {
    path = 'index';
  }

  renderPath(path, res, next);
};

app.listen(config.port);