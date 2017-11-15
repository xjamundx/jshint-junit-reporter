/*jshint node:true */

"use strict";

var fs = require('fs');

var suite = 'jshint';

var wrStream;
var outputFile;

function encode(s) {
	var pairs = {
		"&": "&amp;",
		'"': "&quot;",
		"'": "&apos;",
		"<": "&lt;",
		">": "&gt;"
	};

	for (var r in pairs) {
		if (typeof(s) !== "undefined") {
			s = s.replace(new RegExp(r, "g"), pairs[r]);
		}
	}

	return s || "";
}

function failure_message(failures) {
	var count = failures.length;

	if (count === 1) {
		return "1 JSHINT Failure";
	} else {
		return count + " JSHint Failures";
	}
}

function failure_details(failures) {
	var msg = [];
	var item;

	for (var i = 0; i < failures.length; i++) {
		item = failures[i];
		msg.push(i+1 + ". line " + item.line + ", char " + item.character + ": " + encode(item.reason));
	}

	return msg.join("\n");
}

// jsxhint stores the files in a tmp dir
// this means the data list and the results array don't match
// to remedy we can loop through list and remove the non-matching string
function getMatchingResultFileName(file, failureList) {
	for (var failureFile in failureList) {
		if (file.indexOf(failureFile) === (file.length-failureFile.length)) {
			// if the end of the file provided identically matches that in the failures list
			// the files will be the same just 1 has a bunch of tmpdir rubbish at the front.
			// return the failureFile link
			return failureFile;
		}
	}

	return file;
}

exports.reporter = function (results, data, opts) {
	var out = [];
	var files = {};

	opts = opts || {};
	opts.outputFile = opts.outputFile || null;

	if (opts.outputFile && !outputFile) {
		outputFile = opts.outputFile;
	}

	results.forEach(function (result) {
		result.file = result.file.replace(/^[\.\/\\]*/, '');

		if (!files[result.file]) {
			files[result.file] = [];
		}

		files[result.file].push(result.error);
	});

	out.push("<?xml version=\"1.0\" encoding=\"utf-8\"?>");
	out.push("<testsuite name=\"" + suite + "\" tests=\"" + (data.length || 0) + "\" failures=\"" + results.length + "\" errors=\"0\">");

	// we need at least 1 empty test
	if (!results.length) {
		out.push("\t<testcase name=\"" + suite + "\" />");
	}

	for (var i = 0; i < data.length; i++) {
		var fileName = data[i].file;

		// jsxhint puts the files into a cache dir but doesn't change the location of the results to match
		if (fileName.indexOf('/jsxhint/') > -1) {
			fileName = getMatchingResultFileName(fileName, files);
		}

		// jshint seems to shove itself at the start in some versions
		if (fileName !== 'jshint') {
			if (files[fileName]) {
				// has an error
				out.push("\t<testcase name=\"" + fileName + "\">");
				out.push("\t\t<failure message=\"" + failure_message(files[fileName]) + "\">");
				out.push(failure_details(files[fileName]));
				out.push("\t\t</failure>");
				out.push("\t</testcase>");
			} else {
				out.push("\t<testcase name=\"" + fileName + "\" />");
			}
		}
	}

	out.push("</testsuite>");

	if (outputFile) {
		fs.writeFileSync(outputFile, out.join('\n'));
	} else {
		out = out.join("\n") + "\n";
		process.stdout.write(out);
	}

	return out;
};