PDFCanvas

=========

PDFCanvas implements the &lt;canvas&gt; API and renders into a PDF instead of a canvas tag.

I made this as an attmpt at getting Processing.js to render to PDF files.

---------

My first simple tests are working ... but:

Not yet implemented:
- transforms: scale, rotate, translate, ...
- text, fonts

Needs change to underlying [jsPDF.js](https://github.com/MrRio/jsPDF):
- transparency (as jsPDF.js generates PDF vers. 1.3)
- images

Will never be added as they make no sense:
- pixel manipulations
