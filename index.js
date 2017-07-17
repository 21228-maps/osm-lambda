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

    var githubPayload = {
      path: process.env.GITHUB_PATH,
      message: moment().format('YYYY-MM-DD') + ' update',
    };

    return fetchSHA()
      .then(function (sha) {

        if (sha === 404) {
          throw new Error('sha = 404');
        }
        githubPayload.sha = sha;
        return qo('node["natural"="tree"](' + process.env.EXTENT + ');out;');
      })
      .then(function (data) {

        var content = new Buffer(JSON.stringify(data, null, 2)).toString('base64')
        console.info(content);

        githubPayload.content = content;
        return updateGH(githubPayload);
      })
      .spread(function (response2, body2) {
        console.info(body2)
      })
      .catch(function (r) {
        console.error(r);
      });
  },
};

function fetchSHA() {
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

      var b = JSON.parse(body);
      return b.sha;
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
