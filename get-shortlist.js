'use strict';

const baseUrl = 'https://www.recruitguelph.ca';
const loginPage = '/students/student-login.htm';
const postingsPage = '/myAccount/co-op/postings.htm';

const rp = require('request-promise');
const cheerio = require('cheerio');
const querystring = require('querystring');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require("fs"));

const config = require('./config');

function autoParse(body, response, resolveWithFullResponse) {
    if (response.headers['content-type'].indexOf('application/json') !== -1) {
        response.body = JSON.parse(body);
    } else if (response.headers['content-type'].indexOf('text/html') !== -1) {
        response.body = cheerio.load(body);
    } else {
        response.body = body;
    }

    return resolveWithFullResponse ? response : response.body;
}

const cookieJar = rp.jar();

rp({
    method: 'GET',
    uri: `${baseUrl}${loginPage}`,
    resolveWithFullResponse: true,
    transform: autoParse,
    simple: false,
    jar: cookieJar
}).then((res) => {
    const $ = res.body;
    const $form = $('form[name="form1"]');

    // Scrape form data
    const formAction = $form.attr('action');
    const requestId = $form.find('input[name="request_id"]').attr('value');
    const oamReq = $form.find('input[name="OAM_REQ"]').attr('value');

    return rp({
        method: 'POST',
        uri: `https://sso2.identity.uoguelph.ca${formAction}`,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
        },
        form: {
            request_id: requestId,
            OAM_REQ: oamReq,
            username: config.username,
            password: config.password
        },
        jar: cookieJar,
        followAllRedirects: true,
        transform: autoParse
    });
}).then((res) => {
    console.log("Successfully authenticated!");

    return rp({
        method: 'POST',
        uri: `${baseUrl}${postingsPage}`,
        resolveWithFullResponse: true,
        simple: false,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
        },
        jar: cookieJar,
        formData: {
            'action': 'displaySavedJobs',
            'rand': Math.floor(Math.random() * 100000)
        },
        transform: autoParse
    });
}).then((res) => {
    const $ = res.body;
    const postingIds = [];

    $('#postingsTable').find('.searchResult').each((i, posting) => {
        const postingQS = querystring.parse($(posting).find('td').eq(0).find('a').attr('href'));

        postingIds.push(postingQS.postingId);
    });

    function GetRowInfo(rows, i) {
        return rows.eq(i).find('td').eq(1).text().trim();
    }

    return Promise.reduce(postingIds, (shortlist, postingId) => {
        return rp({
            method: 'POST',
            uri: `${baseUrl}${postingsPage}`,
            resolveWithFullResponse: true,
            simple: false,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/53.0.2785.116 Safari/537.36'
            },
            jar: cookieJar,
            form: {
                'action': 'displayPosting',
                'postingId': postingId
            },
            transform: autoParse
        }).then((res) => {
            const $ = res.body;

            const $postingTables = $('#postingDiv').find('> table');
            const $postingInfo = $postingTables.eq(0).find('tbody tr');
            const $orgInfo = $postingTables.eq(2).find('tbody tr');

            const postingData = {
                job_title: GetRowInfo($postingInfo, 4),
                organization: {
                    name: GetRowInfo($orgInfo, 0),
                    contact: {
                        salutation: GetRowInfo($orgInfo, 2),
                        first_name: GetRowInfo($orgInfo, 3),
                        last_name: GetRowInfo($orgInfo, 4),
                    },
                    address: GetRowInfo($orgInfo, 7),
                    city: GetRowInfo($orgInfo, 8),
                    province: GetRowInfo($orgInfo, 9),
                    postal_code: GetRowInfo($orgInfo, 10),
                    country: GetRowInfo($orgInfo, 11)
                }
            };

            shortlist.push(postingData);

            console.log(`Done fetching data from ${postingData.organization.name}:${postingData.job_title} posting...`);

            return shortlist;
        });
    }, []);

}).then((shortlist) => {
    return fs.writeFileAsync(config.out_file, JSON.stringify({shortlist: shortlist}));
}).then(() => {
    console.log(`Wrote shortlist data to ${config.out_file}!`);
});