const jsdom = require("jsdom");
const request = require("request");

const URI =
  "https://liquipedia.net/rocketleague/Rocket_League_Championship_Series/Season_7/North_America";

function fetchHTML(uri) {
  return new Promise((resolve, reject) => {
    request(uri, function(error, response, body) {
      if (error) {
        reject('http error: ' + error);
      }
      resolve(body);
    });
  });
}

function parseTeam(node) {
  const teamNameNode = node.querySelector(".team-template-text");
  if (teamNameNode === null) throw null;
  const teamNameAbbr = teamNameNode.textContent.trim();
  const teamNameFull = node.querySelector(".team-template-text a").title.trim();
  const teamImgURL = node.querySelector(".team-template-image img").src.trim();
  return {
    name: teamNameAbbr,
    fullName: teamNameFull,
    imgUrl: teamImgURL
  };
}

function parseMatches(node) {
  const matchNodes = node.querySelectorAll(".bracket-popup-body-match");
  const matches = Array.from(matchNodes)
    .map(n => {
      try {
        const scoreString = n.textContent;
        const teamAScore = parseInt(
          n.children[0].children[1].textContent.trim(),
          10
        );
        const teamBScore = parseInt(
          n.children[0].children[3].textContent.trim(),
          10
        );
        const mapName = n.children[0].children[4].textContent.trim();
        return {
          teamAScore,
          teamBScore,
          mapName
        };
      } catch (e) {
        throw e;
      }
    })
    .filter(n => n !== null);
  return matches;
}

function parsePopups(nodes) {
  return nodes
    .map(node => {
      try {
        // Date
        const rawTime = node.querySelector(".timer-object");
        // Remove invalid chars
        const cleanedTime = rawTime.textContent.replace("-", "");
        const date = new Date(Date.parse(cleanedTime));

        // Get teams
        const teamA = parseTeam(
          node.querySelector(".bracket-popup-header-left")
        );
        const teamB = parseTeam(
          node.querySelector(".bracket-popup-header-right")
        );

        // Get matches
        const matches = parseMatches(node);

        return {
          node,
          date,
          teamA,
          teamB,
          matches
        };
      } catch (err) {
        if (err) console.log('err parsing popups: '+err);
        return null;
      }
    })
    .filter(n => n !== null);
}

function getMatchesFromHTML(body) {
  // parse body
  const { window } = new jsdom.JSDOM(body);
  // get .bracket-popup
  const popups = parsePopups(
    Array.from(window.document.querySelectorAll(".bracket-popup"))
  );
  const now = new Date();
  const completed = popups.filter(p => now > p.date);
  return completed;
}

exports.handler = (event, context, cb) => {
  // Fetch and parse
  fetchHTML(URI)
    .then(html => {
      const matches = getMatchesFromHTML(html);
      const response = {
        statusCode: 200,
        body: JSON.stringify(matches)
      };
      cb(null, response);
    })
    .catch(err => cb(err));
};

exports.handler(null, null, (err, d) => console.log(err, d));
