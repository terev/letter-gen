const PDFDocument = require('pdfkit');
const Promise = require('bluebird');
const fs = Promise.promisifyAll(require("fs"));
const _ = require('lodash');
const micromustache = require('micromustache');
const moment = require('moment');

const config = require('./config');
const shortlist = require(`./${config.out_file}`);

let template;

/**
 * @returns {String} Today's formatted date
 */
function Today() {
    return moment().format('MMMM Do Y');
}

fs.readFileAsync('letter-template', 'utf8').then((data) => {
    // Compile the letter template
    template = micromustache.compile(data);
}).then(() => {
    if (!fs.existsSync('letters')) {
        fs.mkdirSync('letters');
    }

    _.each(shortlist.shortlist, (posting) => {
        const doc = new PDFDocument({
            info: {
                Title: `${posting.organization.name} Cover Letter`,
                Author: config.name
            }
        });

        const rendered = template({
            config: config,
            posting: posting,
            today: Today
        });

        doc.pipe(fs.createWriteStream(`letters/${posting.organization.name} Cover Letter.pdf`));

        doc.fontSize(12)
            .font('C:/Windows/Fonts/GOTHIC.ttf');

        _.each(rendered.split(/\r?\n/), (line) => {
            if (!line.length) {
                doc.moveDown();
            } else {
                doc.text(line);
            }
        });

        doc.end();
    });
});

