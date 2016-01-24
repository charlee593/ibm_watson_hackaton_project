/**
 * Copyright 2015 IBM Corp. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

var express = require('express'),
  app = express(),
  extend = require('util')._extend,
  watson = require('watson-developer-cloud'),
  async  = require('async');

// Bootstrap application settings
require('./config/express')(app);

// if bluemix credentials exists, then override local
var credentials = extend({
      "password": "bKunIl9K0s6L",
     "url": "https://gateway.watsonplatform.net/concept-insights/api",
     "username": "13f86366-6f99-424f-bd16-47ef90768eb9",

  version: 'v2'
}); // VCAP_SERVICES

var corpus_id = process.env.CORPUS_ID || '/corpora/di1forob8my1/uoft_csc_news';
var corpus_course_id = process.env.CORPUS_ID || "/corpora/di1forob8my1/uoft_crs_csc";
var corpus_research_id = process.env.CORPUS_ID || "/corpora/di1forob8my1/uoft_csc_research";
var graph_id  = process.env.GRAPH_ID ||  '/graphs/wikipedia/en-20120601';

var querystring = require('querystring');
var https = require('https');

var host = 'https://gateway.watsonplatform.net/concept-insights/api';
var username = '13f86366-6f99-424f-bd16-47ef90768eb9';
var password = 'bKunIl9K0s6L';

var Client = require('node-rest-client').Client;

var client = new Client( {user: "13f86366-6f99-424f-bd16-47ef90768eb9", password: "bKunIl9K0s6L" });

// Create the service wrapper
var conceptInsights = watson.concept_insights(credentials);

app.get('/api/labelSearchCourse', function(req, res, next) {
  console.log("pppssssss");
  console.log(req);
  var params = extend({
    corpus: corpus_course_id,
    prefix: true,
    limit: 10,
    concepts: false
  }, req.query);

console.log(params);
  conceptInsights.corpora.searchByLabel(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

app.get('/api/labelSearch', function(req, res, next) {
  // console.log("pppssssss");
  // console.log(req);
  var params = extend({
    corpus: corpus_id,
    prefix: true,
    limit: 10,
    concepts: true
  }, req.query);

  conceptInsights.corpora.searchByLabel(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

app.get('/api/testing', function(req, res, next) {


 
// direct way 
client.get("https://gateway.watsonplatform.net/concept-insights/api/v2/corpora/di1forob8my1/uoft_crs_csc/documents/" + req.query.document+ "/related_concepts?limit=5", function (data, response) {
  // parsed response body as js object 
  console.log(data);
  // raw response 
  console.log(response);
  res.json(data);
});

});

app.get('/api/conceptualSearch', function(req, res, next) {
    // console.log("pppssssss");
  // console.log(req);
  var params = extend({ corpus: corpus_id, limit: 10 }, req.query);
  conceptInsights.corpora.getRelatedDocuments(params, function(err, data) {
    if (err)
      return next(err);
    else {
      async.parallel(data.results.map(getPassagesAsync), function(err, documentsWithPassages) {
        if (err)
          return next(err);
        else{
          data.results = documentsWithPassages;
          res.json(data);
        }
      });
    }
  });
});

app.get('/api/conceptualSearchResearch', function(req, res, next) {
    // console.log("pppssssss");
  // console.log(req);
  var params = extend({ corpus: corpus_research_id, limit: 10 }, req.query);
  conceptInsights.corpora.getRelatedDocuments(params, function(err, data) {
    if (err)
      return next(err);
    else {
      async.parallel(data.results.map(getPassagesAsync), function(err, documentsWithPassages) {
        if (err)
          return next(err);
        else{
          data.results = documentsWithPassages;
          res.json(data);
        }
      });
    }
  });
});

app.get('/api/related_concepts', function(req, res, next) {

  var params = extend({ 
    corpus: corpus_course_id
  }, req.query);
console.log(params);
  conceptInsights.corpora.getRelatedConcepts(params, function(err, results) {
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

app.post('/api/extractConceptMentions', function(req, res, next) {
  var params = extend({ graph: graph_id }, req.body);
  conceptInsights.graphs.annotateText(params, function(err, results) {
    // console.log(results);
    if (err)
      return next(err);
    else
      res.json(results);
  });
});

/**
 * Builds an Async function that get a document and call crop the passages on it.
 * @param  {[type]} doc The document
 * @return {[type]}     The document with the passages
 */
var getPassagesAsync = function(doc) {
  return function (callback) {
    conceptInsights.corpora.getDocument(doc, function(err, fullDoc) {
      if (err)
        callback(err);
      else {
        doc = extend(doc, fullDoc);
        doc.explanation_tags.forEach(crop.bind(this, doc));
        delete doc.parts;
        callback(null, doc);
      }
    });
  };
};

/**
 * Crop the document text where the tag is.
 * @param  {Object} doc The document.
 * @param  {Object} tag The explanation tag.
 */
var crop = function(doc, tag){
  var textIndexes = tag.text_index;
  var documentText = doc.parts[tag.parts_index].data;

  var anchor = documentText.substring(textIndexes[0], textIndexes[1]);
  var left = Math.max(textIndexes[0] - 100, 0);
  var right = Math.min(textIndexes[1] + 100, documentText.length);

  var prefix = documentText.substring(left, textIndexes[0]);
  var suffix = documentText.substring(textIndexes[1], right);

  var firstSpace = prefix.indexOf(' ');
  if ((firstSpace !== -1) && (firstSpace + 1 < prefix.length))
      prefix = prefix.substring(firstSpace + 1);

  var lastSpace = suffix.lastIndexOf(' ');
  if (lastSpace !== -1)
    suffix = suffix.substring(0, lastSpace);

  tag.passage = '...' + prefix + '<b>' + anchor + '</b>' + suffix + '...';
};

// error-handler settings
require('./config/error-handler')(app);

var port = process.env.VCAP_APP_PORT || 9080;
app.listen(port);
console.log('listening at:', port);
