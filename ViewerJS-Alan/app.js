// If absolute URL from the remote server is provided,
// configure the CORS header on that server.

//
window.pageRendering = false;
window.conf = {};
const getConf = () => window.conf;
const setConf = (conf) => Object.assign(window.conf, conf);
const buildConf = () => {
  const conf = {
    pdfUrl: null,
    pdfDoc: null,
    pageNum: 1,
    pageNumPending: null,
    scale: 1,
    canvas: $('#the-canvas')[0],
  };
  conf.ctx = conf.canvas.getContext('2d');
  const parts = window.location.hash.split('#').filter(x => x);
  if (parts.length === 1) {
    conf.pdfUrl = parts[0];
    return conf;
  }
  if (parts.length === 2) {
    conf.pageNum = parseInt(parts[0], 10) || 1;
    conf.pdfUrl = parts[1];
    return conf;
  }
  console.log(parts);
  throw new Error('Unsupported URL');
};


// The workerSrc property shall be specified.
// eslint-disable-next-line no-undef
PDFJS.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.js';

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPageMeta(conf) {
  const { numPages, pageNum } = conf;
  $('#page_count').text(numPages);
  $('#page_num').text(pageNum);
}


const renderTaskPageLoaded = (page) => {
  const conf = getConf();
  const { canvas, ctx } = conf;
  const height = $(window).height() - 10;
  const viewportUnsized = page.getViewport(1);
  // const viewportHeight = viewportUnsized.height;
  const scale = 0.95 * (height / viewportUnsized.height);
  const viewport = page.getViewport(scale);
  // make the canvas fit the pdf viewport
  canvas.height = viewport.height;
  canvas.width = viewport.width;

  // Render PDF page into canvas context
  const renderContext = {
    canvasContext: ctx,
    viewport,
  };
  return page.render(renderContext).promise;
};
const renderTaskComplete = () => {
  const conf = setConf({ pageRendering: false });
  if (conf.pageNumPending === null) return;
  console.log('pageNumPending, looping back - to re-render', conf);
  // eslint-disable-next-line no-use-before-define
  renderPage(conf);
  // render it
  setConf({ pageNumPending: null });
};
const updateUi = () => {
  const conf = getConf();
  const { numPages, pageNum, pdfUrl } = conf;
  $('#page_count').text(numPages);
  $('#page_num').text(pageNum);
  window.location.hash = `#${pageNum}#${pdfUrl}`;
};

const renderPage = (confIn) => {
  const conf = setConf(confIn);
  const { canvas, pdfDoc, pageNum } = conf;
  // actual rendering
  window.pageRendering = true;
  // Using promise to fetch the page
  return pdfDoc.getPage(pageNum)
  .then(renderTaskPageLoaded)
  .then(renderTaskComplete)
  .then(updateUi);
};

/**
 * If another page rendering in progress,
 * waits until the rendering is finised.
 * Otherwise, executes rendering immediately.
 */
function queueRenderPageNumber(num) {
  const conf = getConf();
  if (conf.pageRendering) {
    setConf({ pageNumPending: num });
  } else {
    renderPage(setConf({ pageNum: num }));
  }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
  let pageNum = getConf().pageNum;
  if (pageNum <= 1) return;
  pageNum -= 1;
  queueRenderPageNumber(pageNum);
}

/**
 * Displays next page.
 */
function onNextPage() {
  const numPages = getConf().numPages;
  let pageNum = getConf().pageNum;
  if (pageNum >= numPages) return;
  pageNum += 1;
  queueRenderPageNumber(pageNum);
}

/**
 * Asynchronously downloads PDF.
 */
function main() {
  const conf = setConf(buildConf());
  // eslint-disable-next-line no-undef
  PDFJS.getDocument(conf.pdfUrl).then(pdfDocObject => {
    conf.pdfDoc = pdfDocObject;
    conf.numPages = conf.pdfDoc.numPages;
    renderPage(conf);
  });

  $('#prev').on('click', onPrevPage);
  $('#next').on('click', onNextPage);
  $('#overlay-prev').on('click', onPrevPage);
  $('#overlay-next').on('click', onNextPage);
}

// document.addEventListener('DOMContentLoaded', main);
$(main);
