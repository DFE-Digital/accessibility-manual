require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs')
const path = require('path')

exports.p_checkpage = async function (req, res) {



    const url = req.body.url;

    if (!isValidUrl(url)) {
        return res.render("app/check-page", { results: null, url, errorMessage: "The provided URL is not a valid website address." });
    }


    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);

        const results = {
            h1Count: checkH1Count($),
            h1InTitle: checkH1InTitle($),
            headingOrder: getHeadingStructure($),
            shortLinks: checkShortLinks($),
            tablesWithoutCaption: checkTablesWithoutCaption($),
            title: getTitleText($),
            images: getAllImagesWithAltText($, url),
            headingStructure: getHeadingStructure($),
            skippedHeadings: checkSkippedHeadings($)
        };

        return res.render("app/check-page", { results, url });

    } catch (error) {
        res.render('/error')
    }
}


exports.p_checkstatement = async function (req, res) {

    const url = req.body.url;

    if (!isValidUrl(url)) {
        return res.render("app/check-statement", { results: null, url, errorMessage: "The provided URL is not a valid website address." });
    }

    try {
        const response = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept-Encoding': 'gzip, deflate, br',
                'Connection': 'keep-alive',
                'Upgrade-Insecure-Requests': '1',
                'Referer': 'https://www.google.com'
            }
        });
        const html = response.data;
        const $ = cheerio.load(html);

        const results = {
            hasFeedbackContactInfo: checkHeading($, 'Feedback and contact information'),
            hasReportingAccessibilityProblems: checkHeading($, 'Reporting accessibility problems with this website'),
            hasEnforcementProcedure: checkHeading($, 'Enforcement procedure'),
            hasTechnicalInformation: checkHeading($, "Technical information about this website's accessibility"),
            hasComplianceStatus: checkHeading($, 'Compliance status'),
            hasPreparation: checkHeading($, 'Preparation of this accessibility statement'),
            hasNonAccessibleContent: checkHeading($, 'Non-accessible content'),
            hasImprovementInfo: checkHeading($, "What we're doing to improve accessibility"),
            containsCommitmentStatement: checkCommitmentStatement($),
            containsComplianceStatement: checkComplianceStatement($),
            containsEnforcementProcedure: checkEnforcementProcedure($),
            dateParagraphs: extractDatesAndParagraphs($),
            containsWCAG22Criteria: checkWCAG2Criteria($)
        };

        return res.render("app/check-statement", { results, url });


    } catch (error) {
        res.render('/error')
    }
}


function calculateValues(data, number) {
    const calculatedData = []

    console.log('calculating')

    data.forEach((item) => {
        const numberresult = Math.ceil((item.percent / 100) * number) // Round up to the nearest whole number so we can account for sub 1 %'s on low user numbers.
        calculatedData.push({
            measure: item.measure,
            number: numberresult,
            source: item.source,
            summary: item.summary,
            type: item.type
        })
    })
    calculatedData.sort((a, b) => b.number - a.number)
   
    return calculatedData
}

exports.g_howmanypeople = async function (req, res) {
    const number = parseInt(req.params.number | 0)
    if (number) {
        fs.readFile('./app/data/stats.json', 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading data.json:', err)
                res.sendStatus(500)
                return
            }
            try {
                const jsonData = JSON.parse(data)
                const calculatedData = calculateValues(jsonData, number)

                res.render('app/how-many-people/index.html', {
                    number,
                    calculatedData
                })
            } catch (err) {
                console.error('Error parsing data.json:', err)
                res.sendStatus(500)
            }
        })
    } else {
        res.redirect('/app/how-many-people')
    }
}

exports.p_howmanypeople = async function (req, res) {
    const number = req.body.numberOfUsers
    console.log(number)
    if (number) {
        res.redirect('/app/how-many-people/' + number)
    } else {
        res.redirect('/app/how-many-people')
    }
}




const checkWCAG2Criteria = ($) => {
    // List of WCAG 2.1 and 2.2 criteria
    const wcagCriteria = [
        "1.1.1", "1.2.1", "1.2.2", "1.2.3", "1.2.4", "1.2.5", "1.2.6", "1.2.7", "1.2.8", "1.2.9",
        "1.3.1", "1.3.2", "1.3.3", "1.3.4", "1.3.5", "1.3.6", "1.4.1", "1.4.2", "1.4.3", "1.4.4",
        "1.4.5", "1.4.6", "1.4.7", "1.4.8", "1.4.9", "1.4.10", "1.4.11", "1.4.12", "1.4.13",
        "2.1.1", "2.1.2", "2.1.3", "2.1.4", "2.2.1", "2.2.2", "2.2.3", "2.2.4", "2.2.5", "2.3.1",
        "2.3.2", "2.3.3", "2.4.1", "2.4.2", "2.4.3", "2.4.4", "2.4.5", "2.4.6", "2.4.7", "2.4.8",
        "2.4.9", "2.4.10", "2.5.1", "2.5.2", "2.5.3", "2.5.4", "2.5.5", "2.5.6", "3.1.1", "3.1.2",
        "3.1.3", "3.1.4", "3.1.5", "3.1.6", "3.2.1", "3.2.2", "3.2.3", "3.2.4", "3.2.5", "3.3.1",
        "3.3.2", "3.3.3", "3.3.4", "3.3.5", "3.3.6", "4.1.1", "4.1.2", "4.1.3", "4.1.4", "4.1.5"
    ];

    const bodyText = $('body').text();
    const foundCriteria = [];
    const paragraphsWithCriteria = [];

    $('p, li').each((index, element) => {
        const paragraphText = $(element).text();
        const matchingCriteria = wcagCriteria.filter(criteria => paragraphText.includes(criteria));
        if (matchingCriteria.length > 0) {
            foundCriteria.push(...matchingCriteria);
            paragraphsWithCriteria.push({
                criteria: matchingCriteria,
                paragraph: $(element).html()
            });
        }
    });

    return { foundCriteria: [...new Set(foundCriteria)], paragraphsWithCriteria };
};



const checkEnforcementProcedure = ($) => {
    const enforcementProcedureText = "The Equality and Human Rights Commission (EHRC) is responsible for enforcing the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018 (the ‘accessibility regulations’). If you’re not happy with how we respond to your complaint, contact the Equality Advisory and Support Service (EASS).";
    let bodyText = $('body').text();

    // Normalize whitespace in both texts
    const normalizeWhitespace = (text) => text.replace(/\s+/g, ' ').trim();
    bodyText = normalizeWhitespace(bodyText);
    const normalizedEnforcementProcedureText = normalizeWhitespace(enforcementProcedureText);

    return bodyText.includes(normalizedEnforcementProcedureText);
};

const extractDatesAndParagraphs = ($) => {
    const keywords = ["created", "updated", "reviewed", "prepared", "tested"];
    const datePattern = /\b(?:\d{1,2}(?:st|nd|rd|th)?[-\/\s]?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|1?\d)[-\/\s]?\d{1,4}|\d{4}[-\/\s]?(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|1?\d)[-\/\s]?\d{1,2}(?:st|nd|rd|th)?|\d{1,2}[-\/\s](?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\b[-\/\s]?\d{4})\b/g;

    const dateParagraphs = [];
    $('p').each((index, element) => {
        const paragraphText = $(element).text();
        const matches = paragraphText.match(datePattern);
        if (matches && keywords.some(keyword => paragraphText.toLowerCase().includes(keyword))) {
            dateParagraphs.push({
                dates: [...new Set(matches)], // Remove duplicate dates within the paragraph
                paragraph: $(element).html()  // Get the HTML content of the paragraph
            });
        }
    });

    return dateParagraphs;
};



const checkHeading = ($, headingText) => {
    return $('h1, h2, h3, h4, h5, h6').filter((index, element) => {
        return $(element).text().trim().toLowerCase() === headingText.toLowerCase();
    }).length > 0;
};

const checkCommitmentStatement = ($) => {
    const statement = "The Department for Education is committed to making its websites accessible, in accordance with the Public Sector Bodies (Websites and Mobile Applications) (No. 2) Accessibility Regulations 2018.";
    return $('body').text().includes(statement);
};

const checkComplianceStatement = ($) => {
    const complianceStatements = [
        "This website is fully compliant",
        "This website is partially compliant",
        "This website is not compliant"
    ];

    let match = null;

    $('p').each((index, element) => {
        const paragraphText = $(element).text();
        complianceStatements.forEach(statement => {
            if (paragraphText.includes(statement)) {
                match = paragraphText;
            }
        });
        if (match) return false; // Break out of the loop if a match is found
    });

    return match;
};


const isValidUrl = (string) => {
    try {
        new URL(string);
        return true;
    } catch (_) {
        return false;
    }
};

const checkH1Count = ($) => {
    return $('h1').length;
};

const getTitleText = ($) => {
    return $('title').text();
};

const checkH1InTitle = ($) => {
    const h1Text = $('h1').first().text();
    const titleText = $('title').text();
    return titleText.includes(h1Text);
};

const checkHeadingOrder = ($) => {
    const headings = $('h1, h2, h3, h4, h5, h6');
    const order = [];
    headings.each((index, element) => {
        order.push({ tag: element.tagName, text: $(element).text().trim() });
    });
    return order;
};

const getHeadingStructure = ($) => {
    const headings = $('h1, h2, h3, h4, h5, h6');
    const structure = [];
    const stack = [];

    headings.each((index, element) => {
        const level = parseInt(element.tagName.substring(1), 10);
        const text = $(element).text().trim();
        const heading = { level, text, children: [] };

        while (stack.length > 0 && stack[stack.length - 1].level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            structure.push(heading);
        } else {
            stack[stack.length - 1].children.push(heading);
        }

        stack.push(heading);
    });

    return structure;
};
const checkShortLinks = ($) => {
    const links = $('a');
    const shortLinks = [];
    links.each((index, element) => {
        const visibleText = getVisibleText($(element), $);
        const hiddenText = getHiddenText($(element), $);

        if (visibleText.split(' ').length <= 2) {
            if (hiddenText) {
                shortLinks.push(`${visibleText} [${hiddenText.trim()}]`.trim());
            } else {
                shortLinks.push(visibleText.trim());
            }
        }
    });
    return shortLinks;
};

const getVisibleText = (element, $) => {
    let text = '';
    element.contents().each(function () {
        if (this.type === 'text') {
            text += $(this).text().trim() + ' ';
        } else if (this.type === 'tag' && !$(this).hasClass('govuk-visually-hidden')) {
            text += getVisibleText($(this), $) + ' ';
        }
    });
    return text.trim();
};

const getHiddenText = (element, $) => {
    let text = '';
    element.find('.govuk-visually-hidden').each(function () {
        text += $(this).text().trim() + ' ';
    });
    return text.trim();
};



const checkTablesWithoutCaption = ($) => {
    const tables = $('table');
    const tablesWithoutCaption = [];
    tables.each((index, element) => {
        if (!$(element).find('caption').length) {
            tablesWithoutCaption.push(index + 1);
        }
    });
    return tablesWithoutCaption;
};



const getAllImagesWithAltText = ($, baseUrl) => {
    const images = $('img');
    const imageAltTexts = [];
    const base = new URL(baseUrl);

    images.each((index, element) => {
        let src = $(element).attr('src');
        const alt = $(element).attr('alt');

        let altText;
        if (alt === undefined) {
            altText = 'No alt tag';
        } else if (alt.trim() === '') {
            altText = 'Empty alt tag';
        } else {
            altText = alt;
        }

        let displaySrc = src;

        // Ensure src includes the full URL
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
            src = new URL(src, base.origin).href;
        }

        imageAltTexts.push({ src, displaySrc, alt: altText });
    });

    return imageAltTexts;
};




const checkSkippedHeadings = ($) => {
    const headings = $('h1, h2, h3, h4, h5, h6');
    const skippedHeadings = [];
    let lastLevel = 0;

    headings.each((index, element) => {
        const level = parseInt(element.tagName.substring(1), 10);

        if (lastLevel && level > (lastLevel + 1)) {
            skippedHeadings.push({
                tag: element.tagName,
                text: $(element).text().trim(),
                skippedFrom: `h${lastLevel}`
            });
        }

        lastLevel = level;
    });

    return skippedHeadings;
};
