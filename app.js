require('dotenv').config();

const express = require('express');
const compression = require('compression');
const nunjucks = require('nunjucks');
const bodyParser = require('body-parser');
const path = require('path');
const routes = require('./app/routes');
const dateFilter = require('nunjucks-date-filter');
const markdown = require('nunjucks-markdown');
const marked = require('marked');
const govukMarkdown = require('govuk-markdown');
const session = require('express-session');
const csrf = require('csurf');

const airtable = require('airtable');
const base = new airtable({ apiKey: process.env.airtableFeedbackKey }).base(
    process.env.airtableFeedbackBase
);

const {
    removeFilter,
    findServiceName,
    formatDateFilter,
    findById,
    formatNumber,
    getFileMetadata,
} = require('./middleware/filters');

const app = express();

// Configure Nunjucks
const nunjuckEnv = nunjucks.configure(
    [
        'app/views',
        'node_modules/govuk-frontend/dist/',
        'node_modules/dfe-frontend/packages/components',
    ], {
        autoescape: true,
        express: app,
        watch: process.env.NODE_ENV === 'development',
        noCache: process.env.NODE_ENV === 'development',
    }
);

// Configure compression with better settings
app.use(
    compression({
        level: 6, // Good balance between compression and CPU usage
        threshold: 1024, // Only compress responses larger than 1KB
        filter: (req, res) => {
            // Don't compress if the client doesn't support it
            if (req.headers['x-no-compression']) {
                return false;
            }
            // Use compression for all other requests
            return compression.filter(req, res);
        },
    })
);

// Serve static files with caching headers
const staticOptions = {
    maxAge: '1y', // Cache static assets for 1 year
    etag: true,
    lastModified: true,
};

// Specific caching for consolidated files
const consolidatedOptions = {
    maxAge: '1y',
    etag: true,
    lastModified: true,
    immutable: true, // Add immutable flag for better caching
};

app.use(
    '/govuk',
    express.static(
        path.join(__dirname, 'node_modules/govuk-frontend/govuk/assets'),
        staticOptions
    )
);
app.use(
    '/dfe',
    express.static(
        path.join(__dirname, 'node_modules/dfe-frontend/dist'),
        staticOptions
    )
);
app.use('/public', express.static('app/public', staticOptions));
app.use('/assets', express.static('app/public', staticOptions));
app.use(
    '/node_modules',
    express.static(path.join(__dirname, 'node_modules'), staticOptions)
);

// Serve consolidated files with specific caching
app.use(
    '/public/css/consolidated.min.css',
    express.static('app/public/css/consolidated.min.css', consolidatedOptions)
);
app.use(
    '/public/js/consolidated.min.js',
    express.static('app/public/js/consolidated.min.js', consolidatedOptions)
);
app.use(express.json());

// Parse URL-encoded bodies (as sent by HTML forms)
app.use(express.urlencoded({ extended: true }));

app.use(
    '/favicon.ico',
    express.static(path.join(__dirname, 'public/assets/images/favicon.ico'))
);

// Add date filter
nunjuckEnv.addFilter('date', dateFilter);

// Add custom filters
nunjuckEnv.addFilter('removeFilter', removeFilter);
nunjuckEnv.addFilter('findServiceName', findServiceName);
nunjuckEnv.addFilter('findById', findById);
nunjuckEnv.addFilter('formatDateFilter', formatDateFilter);
nunjuckEnv.addFilter('formatNumber', formatNumber);
nunjuckEnv.addFilter('getFileMetadata', getFileMetadata);
nunjuckEnv.addGlobal('govukRebrand', true);

// Add updateQueryParams filter for pagination
nunjuckEnv.addFilter('updateQueryParams', function(url, params) {
    const urlObj = new URL(url, 'http://localhost');
    Object.entries(params).forEach(([key, value]) => {
        if (value) {
            urlObj.searchParams.set(key, value);
        } else {
            urlObj.searchParams.delete(key);
        }
    });
    return urlObj.pathname + urlObj.search;
});

// Add tojson filter
nunjuckEnv.addFilter('tojson', function(obj) {
    return JSON.stringify(obj);
});

nunjuckEnv.addFilter('find', function(arr, opts) {
    if (!Array.isArray(arr) ||
        !opts ||
        !opts.attribute ||
        typeof opts.value === 'undefined'
    )
        return null;
    return arr.find(item => item[opts.attribute] == opts.value);
});

// Register marked and markdown libraries
marked.use(
    govukMarkdown({
        headingsStartWith: 'xl',
    })
);

markdown.register(nunjuckEnv, marked.parse);


// Set view engine
app.set('view engine', 'html');
app.set('views', [path.join(__dirname, 'app/views')]);

// Add security and performance headers
app.use((req, res, next) => {
    // Security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Performance headers
    res.setHeader('Vary', 'Accept-Encoding');

    // Cache control for HTML pages
    if (
        req.path.endsWith('.html') ||
        (!req.path.includes('.') && req.path !== '/')
    ) {
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache HTML for 1 hour
    }

    next();
});

// 301 Redirects from old site structure to new site structure
const redirectMap = {
    // Tools & Testing
    '/knowledge-hub/tools-testing/vision': '/tools-testing/vision',
    '/knowledge-hub/tools-testing/motor': '/tools-testing/motor',
    '/knowledge-hub/tools-testing/hearing': '/tools-testing/hearing',
    '/knowledge-hub/tools-testing/cognitive': '/tools-testing/cognitive',
    '/knowledge-hub/tools-testing/false-positives': '/tools-testing/false-positives',
    '/knowledge-hub/tools-testing/tools/accessibility-insights': '/tools-testing/tools/accessibility-insights',
    '/knowledge-hub/tools-testing/tools/arc': '/tools-testing/tools/arc-toolkit',
    '/knowledge-hub/tools-testing/tools/axe': '/tools-testing/tools/axe-devtools',
    '/knowledge-hub/tools-testing/tools/contrast': '/tools-testing/tools/contrast-checker',
    '/knowledge-hub/tools-testing/tools/headings-map': '/tools-testing/tools/headingsmap',
    '/knowledge-hub/tools-testing/tools/wave': '/tools-testing/tools/wave-evaluation',
    '/knowledge-hub/tools-testing/tools/lists': '/tools-testing/tools/lists',
    '/knowledge-hub/tools-testing/tools/blur': '/tools-testing/tools/blur',
    '/knowledge-hub/tools-testing/tools/target-size': '/tools-testing/tools/target-size',
    '/knowledge-hub/tools-testing/tools/text-spacing': '/tools-testing/tools/text-spacing',
    '/knowledge-hub/tools-testing/tools/resize-text': '/tools-testing/tools/resize-text',
    '/knowledge-hub/tools-testing/tools/voiceover': '/tools-testing/tools/voiceover',
    '/knowledge-hub/tools-testing/tools/screen-readers': '/tools-testing/tools/screen-readers',
    // Audits, Issues, Statements
    '/knowledge-hub/audits-issues-statements': '/audits-issues-statements',
    '/knowledge-hub/audits-issues-statements/audits/after-an-audit': '/audits-issues-statements/audits/after-an-audit',
    '/knowledge-hub/audits-issues-statements/audits/get-an-audit': '/audits-issues-statements/audits/get-an-audit',
    '/knowledge-hub/audits-issues-statements/issues/common-issues': '/audits-issues-statements/issues/common-issues',
    '/knowledge-hub/audits-issues-statements/issues/manage-and-prioritise-issues': '/audits-issues-statements/issues/manage-and-prioritise-issues',
    '/knowledge-hub/audits-issues-statements/issues/disproportionate-burden': '/audits-issues-statements/issues/disproportionate-burden',
    '/knowledge-hub/audits-issues-statements/accessibility-statements/fully-compliant': '/audits-issues-statements/accessibility-statements/fully-compliant',
    '/knowledge-hub/audits-issues-statements/accessibility-statements/partially-compliant': '/audits-issues-statements/accessibility-statements/partially-compliant',
    '/knowledge-hub/audits-issues-statements/accessibility-statements/non-compliant': '/audits-issues-statements/accessibility-statements/non-compliant',
    '/knowledge-hub/audits-issues-statements/accessibility-statements/templates': '/audits-issues-statements/accessibility-statements/templates',
    // WCAG and Guidance
    '/knowledge-hub/wcag': '/guidelines/wcag',
    '/knowledge-hub/wcag/criteria': '/guidelines/wcag/criteria',
    '/knowledge-hub/wcag/criteria/perceivable': '/guidelines/wcag/criteria/perceivable',
    '/knowledge-hub/wcag/criteria/operable': '/guidelines/wcag/criteria/operable',
    '/knowledge-hub/wcag/criteria/understandable': '/guidelines/wcag/criteria/understandable',
    '/knowledge-hub/wcag/criteria/robust': '/guidelines/wcag/criteria/robust',
    '/knowledge-hub/wcag/conformance': '/guidelines/wcag/conformance',
    '/knowledge-hub/coga': '/guidelines/coga',
};



app.use((req, res, next) => {
    // Normalize path: remove trailing slash (except for root), and lowercase
    let reqPath = req.path;
    if (reqPath.length > 1 && reqPath.endsWith('/')) {
        reqPath = reqPath.slice(0, -1);
    }
    // Check both original and lowercased path for flexibility
    const target = redirectMap[reqPath] || redirectMap[reqPath.toLowerCase()];
    //console.log('Redirect middleware:', req.path, '| Normalized:', reqPath, '| Target:', target);
    if (target) {
        //console.log(`Redirecting ${req.path} -> ${target}`);
        return res.redirect(301, target);
    }
    next();
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
            "Service": "Accessibility manual",
            "URL": pageURL
        }
    }], function(err) {
        if (err) {
            console.error(err);
            return res.status(500).send('Error saving to Airtable');
        }
        res.json({ success: true, message: 'Feedback submitted successfully' });
    });
});


// Make request object available to all templates
app.use((req, res, next) => {
    res.locals.req = req;
    res.locals.env = process.env.NODE_ENV;
    next();
});

// Just do basic session handling
app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: false,
        saveUninitialized: true,
    })
);

// Add navigation items and DfE-specific variables to all responses
app.use((req, res, next) => {
    res.locals.user = req.session.user;
    res.locals.currentPath = req.path;
    res.locals.navigationItems = req.session.user ?
        getNavigationItems(req.session.user) : [];
    res.locals.serviceName = process.env.SERVICE_NAME;
    res.locals.env = process.env.NODE_ENV;
    // Set default dateModified to today for LD+JSON
    res.locals.dateModified = new Date().toISOString().split('T')[0];
    next();
});


// Use application routes (move this up)
app.use('/', routes);


// Clean URLs
app.get(/\.html?$/i, function(req, res) {
    let urlPath = req.path;
    const parts = urlPath.split('.');
    parts.pop();
    urlPath = parts.join('.');
    res.redirect(urlPath);
});

// Dynamic Route Matching for URLs without extensions
app.get(/^([^.]+)$/, function(req, res, next) {
    matchRoutes(req, res, next);
});

// Route matching function
function matchRoutes(req, res, next) {
    let path = req.path;
    path = path.startsWith('/') ? path.slice(1) : path;
    if (path === '') {
        path = 'index';
    }
    //console.log(path);
    renderPath(path, res, next);
}

function renderPath(path, res, next) {
    res.render(path, function(error, html) {
        if (!error) {
            res.set({ 'Content-type': 'text/html; charset=utf-8' });
            res.end(html);
            return;
        }
        if (!error.message.startsWith('template not found')) {
            next(error);
            return;
        }
        if (!path.endsWith('/index')) {
            renderPath(path + '/index', res, next);
            return;
        }
        next();
    });
}

// Handle 404 errors
app.use(function(req, res, next) {
    res.status(404).render('404');
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        method: req.method,
        originalMethod: req.originalMethod,
        path: req.path,
        body: req.body,
    });

    if (err.code === 'EBADCSRFTOKEN') {
        return res.status(403).render('error', {
            message: 'Invalid CSRF token',
            error: process.env.NODE_ENV === 'development' ? {
                stack: 'The form submission failed the CSRF validation. Please try again.',
            } : null,
        });
    }

    res.status(500).render('error', {
        message: 'Something went wrong',
        error: process.env.NODE_ENV === 'development' ? {
            stack: err.stack || err.message,
        } : null,
    });
});

// Add a route that serves the app/robots.txt file
app.get('/robots.txt', function(req, res) {
    res.sendFile(path.join(__dirname, 'app/robots.txt'));
});




// Start the server
const PORT = process.env.PORT || 3519;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;