#! /usr/bin/env node

/* globals require, process */

'use strict';

let _ = require('lodash'),
    semverRegex = require('semver-regex'),
    program = require('commander');

function keyList(val) {
    return val.split(',');
}

program
    .version('0.1.0')
    .usage('[options]')
    .option('-q, --quiet', 'suppress all output')
    .option('-o, --output <keys>', 'limit output to the specified keys', keyList)
    .option('-v, --value <key>', 'output the specified value')
    .option('-t, --true <keys>', 'assert that the specified keys are truthy', keyList)
    .option('-f, --false <keys>', 'assert that the specified keys are falsy', keyList)
    .parse(process.argv);

let input = '';

process.stdin.setEncoding('utf8');

process.stdin.on('readable', () => {
    let chunk = process.stdin.read();

    if (chunk) {
        input += chunk;
    }
});

process.stdin.on('end', () => {
    let lines = input.match(/\S+:\S+.*/gi),
        inspection = {
            hasForks: false,
            versionMap: {}
        },
        output = '',
        exitCode = 0;

    _.forEach(lines, line => {
        let parts = line.split(' '),
            packageName = parts[0],
            versions = _.drop(parts, 1);

        if (versions.length === 1) {
            inspection.versionMap[packageName] = versions[0];
        } else if (versions.length > 1) {
            inspection.versionMap[packageName] = versions;
            inspection.hasForks = true;
            inspection.forks = inspection.forks || {};
            inspection.forks[packageName] = versions;
        }

        _.forEach(versions, version => {
            if (!semverRegex().test(version)) {
                inspection.hasAnomalousVersions = true;
                inspection.anomalousVersions = inspection.anomalousVersions || {};
                inspection.anomalousVersions[packageName] = inspection.versionMap[packageName];
            }
        });
    });

    if (program.true || program.false) {
        let assertion = {
            assertion: true,
            values: {}
        };

        if (program.true) {
            _.forEach(program.true, key => {
                assertion.values[key] = !!inspection[key];
                assertion.assertion = assertion && !!inspection[key];
            });
        }

        if (program.false) {
            _.forEach(program.false, key => {
                assertion.values[key] = !!inspection[key];
                assertion.assertion = assertion && !inspection[key];
            });
        }

        output = JSON.stringify(assertion);
        exitCode = assertion.assertion ? 0 : 1;
    } else {
        if (program.value) {
            output = JSON.stringify(inspection[program.value]);
        } else if (program.output) {
            output = JSON.stringify(_.pick(inspection, program.output));
        } else {
            output = JSON.stringify(inspection);
        }
    }

    if (!program.quiet) {
        console.log(output);
    }

    process.exit(exitCode);
});
