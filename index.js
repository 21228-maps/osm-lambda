var Promise = require('bluebird');
var request = Promise.promisify(require('request'), { multiArgs: true });
var qo = Promise.promisify(require('query-overpass'));
var moment = require('moment');

var urlPath = [
  'https://api.github.com/repos',
  process.env.GITHUB_OWNER,
  process.env.GITHUB_REPO,
  'contents',
  process.env.GITHUB_PATH
].join('/');

module.exports = {
  pushTrees: function () {

    var commitPayload = {
      path: process.env.GITHUB_PATH,
      message: moment().format('YYYY-MM-DD') + ' update',
    };

    return fetchContent()
      .then(function (contentPayload) {
        commitPayload.sha = contentPayload.sha;
        return qo('node["natural"="tree"](' + process.env.EXTENT + ');out;')
          .then(function (data) {

            var newVersion = JSON.stringify(data, null, 2);
            var working = new Buffer(contentPayload.content, 'base64').toString('utf8');

            // if the new data identical to the old, there is no need to commit
            // anything.
            if (newVersion === working) {
              console.info('no changes');
              return;
            }

            commitPayload.content = new Buffer(newVersion).toString('base64');
            return updateGH(commitPayload);
          })
      })
      .catch(function (r) {
        throw new Error(r);
      });
  },
};

function fetchContent() {
  var options = {
    method: 'GET',
    contentType: 'application/json',
    headers: {
      'User-Agent': 'CenturyOps',
    },
    qs: {
      access_token: process.env.GITHUB_API_TOKEN,
    },
    url: urlPath,
  };

  return request(options)
    .spread(function (response, body) {
      return JSON.parse(body);
    })
    .catch(function (error) {
      throw new Error(error);
    });
}

function updateGH(githubPayload) {
  var options = {
    method: 'PUT',
    contentType: 'application/json',
    body: githubPayload,
    json: true,
    headers: {
      'User-Agent': 'treeAgent',
    },
    qs: {
      access_token: process.env.GITHUB_API_TOKEN,
    },
    url: urlPath,
  };

  return request(options);
}
