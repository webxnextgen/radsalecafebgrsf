const fs        = require('fs');
const CDP       = require('chrome-remote-interface');
const cheerio   = require('cheerio');
const _         = require('lodash');
const request   = require('request');

  let uri = "https://www.google.bg/maps/place/%D0%A7%D0%B0%D0%B5%D0%BD+%D0%BC%D0%B0%D0%B3%D0%B0%D0%B7%D0%B8%D0%BD+%D0%A8%D0%B0%D0%BD%D0%B3%D1%80%D0%B8+%D0%9B%D0%B0+-+%D0%9A%D0%B8%D1%82%D0%B0%D0%B9%D1%81%D0%BA%D0%B8+%D0%B8+%D0%AF%D0%BF%D0%BE%D0%BD%D1%81%D0%BA%D0%B8+%D1%87%D0%B0%D0%B9+%D0%B2+%D0%91%D1%8A%D0%BB%D0%B3%D0%B0%D1%80%D0%B8%D1%8F/@42.684459,23.316366,3a,75y,90t/data=!3m8!1e2!3m6!1sAF1QipO3LWEnbPY3SKbNrxwcxQiv1GqKYUHgBKn7q-L5!2e10!3e12!6shttps:%2F%2Flh5.googleusercontent.com%2Fp%2FAF1QipO3LWEnbPY3SKbNrxwcxQiv1GqKYUHgBKn7q-L5%3Dw156-h117-k-no!7i4032!8i3024!4m12!1m6!3m5!1s0x40aa8510202ee4f9:0xc91edb3fa5203685!2z0KfQsNC10L0g0LzQsNCz0LDQt9C40L0g0KjQsNC90LPRgNC4INCb0LAgLSDQmtC40YLQsNC50YHQutC4INC4INCv0L_QvtC90YHQutC4INGH0LDQuSDQsiDQkdGK0LvQs9Cw0YDQuNGP!8m2!3d42.6844589!4d23.316366!3m4!1s0x40aa8510202ee4f9:0xc91edb3fa5203685!8m2!3d42.6844589!4d23.316366";

var dumpBody = function (document) {
    fs.writeFile('helloworld.html', document, function (err) {
      if (err) return console.log(err);
      console.log('Hello World > helloworld.html');
    });
};

// const _fNoSSRGoogle = () => {

//
//   var dumpBody = function (document) {
//       fs.writeFile('helloworld.html', jsdom.serializeDocument(document), function (err) {
//         if (err) return console.log(err);
//         console.log('Hello World > helloworld.html');
//       });
//   };
//
//   jsdom.env({
//       url: uri,
//       scripts: ["http://code.jquery.com/jquery.js"],
//       features: {
//           FetchExternalResources   : ['script', 'frame'],
//           ProcessExternalResources : ['script', 'frame']
//       },
//       pretendToBeVisual: true,
//       done: function (errors, window) {
//         setTimeout(function() {
//           console.log("Here")
//           var $ = window.$;
//           $(".gallery-image-high-res").each(function() {
//             console.log(" -", $(this));
//           });
//           // dumpBody(window.document)
//         }, 10000)
//           // window.addEventListener('load',  function(){
//           //
//           // })
//       }
//   });
//
//   console.log("Goodbye world");
// }
//
// _fNoSSRGoogle();

const viewportWidth = 1440;
const viewportHeight = 8000;

var download = function(uri, filename, callback){
  request.head(uri, function(err, res, body){
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

const jsDOMifyHTML = (html) => {
  var $ = cheerio.load(html);
  var elements = [];
  $('.gallery-image-low-res').each((idx, x) => elements.push($(x).attr("style")));
  $('.gallery-image-high-res').each((idx, x) => elements.push($(x).attr("style")));
  elements = elements.filter(x => x !== "background-image:url(//:0)");
  var rX = /"h(.*?)"/g
  var images = elements.join(" ").match(rX);
  images = images
            .map(x => x.replace(/['"]+/g, ''))
            .map(x => x.replace(/=.+$/, ''))

  images = _.uniq(images)

  const hqPath = "cache/images/gallery/hq/"
  var imagesHQ = images.map(x => [] + x + "=s5000")
  const lqPath = "cache/images/gallery/lq/"
  var imagesLQ = images.map(x => [] + x + "=s600")

  imagesHQ.map((e, idx) => download(e, hqPath + idx + ".jpg", () => {}))
  imagesLQ.map((e, idx) => download(e, lqPath + idx + ".jpg", () => {}))

  var jsonForFrontendFramework = [];
  var jsonForFrontendFrameworkEntry = {
    title: '',
    image: {
      hq: '',
      lq: ''
    }
  };
  images.map((e, idx) => jsonForFrontendFramework.push(
    Object.assign(
      {},
      jsonForFrontendFrameworkEntry,
      {
        image: {
          hq: [] + "/" + hqPath + idx + ".jpg",
          lq: [] + "/" + lqPath + idx + ".jpg",
        }
      }
    )
  )
)

  console.dir(jsonForFrontendFramework)

  var outputJSON = JSON.stringify(jsonForFrontendFramework)

  fs.writeFile('gallery.json', outputJSON, 'utf8', function (err) {
    if (err) return console.log(err);
    console.log('jsonForFrontendFramework > gallery.json');
  });
}

CDP(async (client) => {
  // Extract used DevTools domains.
  const {DOM, Emulation, Network, Page, Runtime} = client;

  // Enable events on domains we are interested in.
  await Page.enable();
  await DOM.enable();
  await Network.enable();

  // If user agent override was specified, pass to Network domain
  // if (userAgent) {
  //   await Network.setUserAgentOverride({userAgent});
  // }

  // Set up viewport resolution, etc.
  const deviceMetrics = {
    width: viewportWidth,
    height: viewportHeight,
    deviceScaleFactor: 0,
    mobile: false,
    fitWindow: false,
  };
  await Emulation.setDeviceMetricsOverride(deviceMetrics);
  await Emulation.setVisibleSize({width: viewportWidth, height: viewportHeight});
  request('https://code.jquery.com/jquery.js', async function (error, response, body) {
    await Page.addScriptToEvaluateOnLoad({ scriptSource: body });
    Page.navigate({url: uri});

    // Evaluate outerHTML after page has loaded.
    Page.loadEventFired(async () => {
      const {root: {nodeId: documentNodeId}} = await DOM.getDocument();
      const {nodeId: bodyNodeId} = await DOM.querySelector({
        selector: 'body',
        nodeId: documentNodeId,
      });
      const {model: {height}} = await DOM.getBoxModel({nodeId: bodyNodeId});

      await Emulation.setVisibleSize({width: viewportWidth, height: height});
      // This forceViewport call ensures that content outside the viewport is
      // rendered, otherwise it shows up as grey. Possibly a bug?
      // await Emulation.forceViewport({x: 0, y: 0, scale: 1});

      setTimeout(function () {
        Runtime.evaluate({expression: 'document.body.outerHTML'}).then((result) => {
          console.log(result.result.value);
          jsDOMifyHTML(result.result.value)
          client.close();
        });
      }, 20 * 1000)
    });
  })
}).on('error', (err) => {
  console.error('Cannot connect to browser:', err);
});
