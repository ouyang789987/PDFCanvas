/**
 *	Release: @@release-number@@, build: @@build-number@@
 */

var PDFCanvas = (function(){

	if ( !( 'jsPDF' in window ) ) {
		throw( 'jsPDF is missing, make sure to include it before using PDFCanvas.' );
	}

	var colorStringToColor = function ( style ) {
		var c = style.toLowerCase();
		c = c.replace(/[\s]+/ig,'');
		var cA = cR = cG = cB = undefined;
		if ( c.indexOf('#') !== -1 ) {
			var cHex = c.replace('#','0x');
			if ( cHex.length == 5 ) {
				cHex = '0x' + cHex[2] + cHex[2] + cHex[3] + cHex[3] + cHex[4] + cHex[4];
			}
			var cInt = parseInt( cHex, 16 );
			if ( cInt > 16777215 ) {
				cA = (cInt >> 24) & 0xFF;
				cA = cA / 255.0;
			}
			cR = (cInt >> 16) & 0xFF;
			cG = (cInt >> 8)  & 0xFF;
			cB =  cInt        & 0xFF;
		} else if ( c.indexOf('rgb') !== -1 ) {
			c = c.replace(/rgb[a]?\(([^)]+)\)/ig,'$1');
			cArr = c.split(',');
			cR = parseInt( cArr[0] );
			cG = parseInt( cArr[1] );
			cB = parseInt( cArr[2] );
			cA = cArr[3] ? parseFloat(cArr[3]) : undefined;
			if ( cA && cA > 1 ) {
				cA /= 255.0;
			}
		} else if ( c.indexOf('hsl') !== -1 ) {
			throw( 'HSL colors are not yet implemented' );
			// http://dev.w3.org/csswg/css3-color/#hsl-color
		} else if ( htmlColors && c in htmlColors ) {
			return htmlColors[c];
		} else {
			throw( 'Unable to parse color style: ' + style );
		}
		cR = cR / 255.0;
		cG = cG / 255.0;
		cB = cB / 255.0;
		return {
			r: cR, g: cG, b: cB, 
			a: cA
		}
	}

	var colorToColorString = function ( c, a ) {
		var cs = parseInt(c.r*255) + ',' +
				 parseInt(c.g*255) + ',' +
				 parseInt(c.b*255);

		if ( a !== 1.0 ) {
			return 'rgba(' + cs + ',' + a + ')';
		} else {
			return 'rgb(' + cs + ')';
		}
	}

	var htmlColors = (function(){
		return {
			aqua : colorStringToColor('#00FFFF'), 
			black : colorStringToColor('#000000'), 
			blue : colorStringToColor('#0000FF'), 
			fuchsia : colorStringToColor('#FF00FF'), 
			gray : colorStringToColor('#808080'), 
			green : colorStringToColor('#008000'), 
			lime : colorStringToColor('#00FF00'), 
			maroon : colorStringToColor('#800000'), 
			navy : colorStringToColor('#000080'), 
			olive : colorStringToColor('#808000'), 
			purple : colorStringToColor('#800080'), 
			red : colorStringToColor('#FF0000'), 
			silver : colorStringToColor('#C0C0C0'), 
			teal : colorStringToColor('#008080'), 
			white : colorStringToColor('#FFFFFF'), 
			yellow : colorStringToColor('#FFFF00'),
			transparent : colorStringToColor('#ffffffff')
		}
	})();

	var testColorConversion = function () {
		console.log( 'Testing color style to color conversion ...' );
		var tests = [
			['#ff00ff',{r:1,g:0,b:1}],
			['#f0f',{r:1,g:0,b:1}],
			['#eeff00ff',{r:1,g:0,b:1,a:(238/255.0)}],
			['rgb(255,255,0)',{r:1,g:1,b:0}],
			['rgba(255,0,0,255)',{r:1,g:0,b:0,a:1}],
			['rgba(255,0,0,0.5)',{r:1,g:0,b:0,a:0.5}],
			['red',{r:1,g:0,b:0}]
		];
		for ( var i = 0, k = tests.length; i < k; i++ ) {
			var r = colorStringToColor( tests[i][0] );
			for ( var n in tests[i][1] ) {
				if ( tests[i][1][n] !== r[n] ) {
					console.log( 'Failed!', tests[i][0], tests[i][1], r );
					return;
				}
			}
		}
		console.log( '... all fine!' );
	}

	var isValidTextAlign = function ( align ) {
		return ([
			"start", "end", "left", "right", "center"
		].indexOf(align.toLowerCase()) !== -1);
	}

	var isValidTextBaseline = function ( baseLine ) {
		return ([
			"top", "hanging", "middle", "alphabetic", "ideographic", "bottom"
		].indexOf(baseLine.toLowerCase()) !== -1);
	}

	var isValidLineCap = function ( lineCap ) {
		return ([
			"butt", "round", "square"
		].indexOf(lineCap.toLowerCase()) !== -1);
	}

	var isValidLineJoin = function ( lineJoin ) {
		return ([
			"round", "bevel", "miter"
		].indexOf(lineJoin.toLowerCase()) !== -1);
	}

	var isValidCompositionOperation = function ( compOp ) {
		return ([
			"source-atop", "source-in", "source-out", "source-over",
			"destination-atop", "destination-in", "destination-out",
			"destination-over", "lighter", "copy", "xor"
		].indexOf(compOp.toLowerCase()) !== -1);
	}

	var setStyleFromStack = function () {
		//
		jsPdf.setFillColor( currentStyle.fill.r * 255, currentStyle.fill.g * 255, currentStyle.fill.b * 255 );
		//
		jsPdf.setDrawColor( currentStyle.stroke.r * 255, currentStyle.stroke.g * 255, currentStyle.stroke.b * 255 );
		// jsPdf.setLineCap( currentStyle.lineCap );
		// jsPdf.setLineJoin( currentStyle.lineJoin );
		jsPdf.setLineWidth( currentStyle.lineWidth );
		//
		//jsPdf.setTextColor( currentStyle.fill.r, currentStyle.fill.g, currentStyle.fill.b );
	}

	/*
	 +	 Classes Style and StyleStack
	 +
	 + + + + + + + + + + + + + + + + + + + */

	var PDFContextStyle = function () {
		this.reset();
	};
	PDFContextStyle.prototype = {
		reset : function () {
			this.fill = this.stroke = { r:0.0, g:0.0, b:0.0 };
			this.globalAlpha = 1.0;
			this.globalCompositeOperation = 'source-over';
			this.lineCap = 'butt';
			this.lineJoine = 'miter';
			this.lineWidth = 1.0;
			this.miterLimit = null;
			this.shadowBlur = this.shadowOffsetX = 
				this.shadowOffsetY = 0;
			this.shadowColor = null;
			this.fontFamily = null;
			this.fontSize = 10;
			this.fontWeight = null;
			this.fontStyle = null;
			this.fontVariant = null;
			this.fontStretch = null;
			this.textAlign = 'start';
			this.textBaseline = 'alphabetic';
		}
	}
	var PDFContextStyleStack = function () {
		this.stack = [new PDFContextStyle()];
	}
	PDFContextStyleStack.prototype = {
		push : function () {
			var style = new PDFContextStyle();
			this.stack.push( style );
			return style;
		},
		pop : function () {
			if ( this.stack.length == 0 ) {
				throw( 'Number of save() / restore() do not match!' );
			}
			return this.stack.pop();
		},
		top : function () {
			return this.stack[this.stack.length-1];
		}
	}

	/*
	 +	 Classes Shape recorder
	 +
	 + + + + + + + + + + + + + + + + + + + */

	var PDFContextShapeRecorder = function () {
		this.vertices = [];
	}
	PDFContextShapeRecorder.prototype = {
		moveTo : function ( x, y ) {
			this.vertices.push( [x, y] );
		},
		lineTo : function ( x, y ) {
			this.vertices.push( [x, y] );
		},
		quadraticCurveTo : function ( cpx, cpy, x, y ) {
		},
		bezierCurveTo : function ( cp1x, cp1y, cp2x, cp2y, x, y ) {
		},
		closePath : function () {
		}
	}

	/*
	 +	 Private variables
	 +
	 + + + + + + + + + + + + + + + + + + + */

	var pdfContext = undefined;
	var styleStack = new PDFContextStyleStack();
	var currentStyle = styleStack.top();
	var shapeRecorder = null;

	/**
	 *	Class PDFContext
	 *
	 *	see: http://dev.w3.org/html5/2dcontext/
	 */
	var PDFContext = function () {
		var pdfContext = this;
	}
	PDFContext.prototype = {

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-canvas
		// canvas	nsIDOMHTMLCanvasElement	Back-reference to the canvas element for which this context was created. Read only.
		get canvas() {
			return pdfCanvas;
		},

		/*
		 +	 S T A T E S
		 +
		 + + + + + + + + + + + */

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-save
		// void save ();
		save : function () {
			styleStack.push();
			currentStyle = styleStack.top();
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-restore
		// void restore ();
		restore : function () {
			styleStack.pop();
			currentStyle = styleStack.top();
		},

		/*
		 +	 T R A N S F O R M
		 +
		 + + + + + + + + + + + */

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-scale
		// void scale (in float x, in float y);
		scale : function () {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-rotate
		// void rotate (in float angle);
		rotate : function () {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-translate
		// void translate (in float x, in float y);
		translate : function () {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-transform
		// void transform (in float m11, in float m12, in float m21, in float m22, in float dx, in float dy); Requires Gecko 1.9
		transform : function () {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-settransform
		// void setTransform (in float m11, in float m12, in float m21, in float m22, in float dx, in float dy); Requires Gecko 1.9
		setTransform : function () {

		},

		/*
		 +	 C O M P O S I T I N G
		 +
		 + + + + + + + + + + + + + + + */

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-globalalpha
		// globalAlpha	float	Default 1.0 -- opaque.
		get globalAlpha () {
			return currentStyle.globalAlpha;
		},
		set globalAlpha ( alpha ) {
			currentStyle.globalAlpha = alpha;
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-globalcompositeoperation
		// globalCompositeOperation	DOMString	Default "over".
		get globalCompositeOperation () {
			return currentStyle.globalCompositeOperation;
		},
		set globalCompositeOperation ( compOp ) {
			currentStyle.globalCompositeOperation = compOp;
			throw( 'Not yet implemented.' );
		},

		/*
		 +	 C O L O R S + S T Y L E S
		 +
		 + + + + + + + + + + + + + + + */
 
 		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-strokestyle
		// strokeStyle	nsIVariant
		get strokeStyle () {
			return colorToColorString( currentStyle.stroke, currentStyle.globalAlpha );
		},
		set strokeStyle ( stroke ) {
			var c = colorStringToColor( stroke );
			currentStyle.stroke = c;
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-fillstyle
		// fillStyle	nsIVariant
		get fillStyle () {
			return colorToColorString( currentStyle.fill, currentStyle.globalAlpha );
		},
		set fillStyle ( fill ) {
			var c = colorStringToColor( fill );
			currentStyle.fill = c;
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-createlineargradient
		// nsIDOMCanvasGradient createLinearGradient (in float x0, in float y0, in float x1, in float y1);
		createLinearGradient : function () {
			throw( 'Not yet implemented.' );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-createradialgradient
		// nsIDOMCanvasGradient createRadialGradient (in float x0, in float y0, in float r0, in float x1, in float y1, in float r1);
		createRadialGradient : function () {
			throw( 'Not yet implemented.' );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-createpattern
		// nsIDOMCanvasPattern createPattern (in nsIDOMHTMLElement image, in DOMString repetition);
		createPattern : function () {
			throw( 'Not yet implemented.' );
		},

		// interface CanvasDrawingStyles {

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-linewidth
		// attribute unrestricted double lineWidth; // (default 1)
		get lineWidth () {
			return currentStyle.lineWidth;
		},
		set lineWidth ( line ) {
			currentStyle.lineWidth = line;
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-linecap
		// attribute DOMString lineCap; // "butt", "round", "square" (default "butt")
		get lineCap () {
			return currentStyle.lineCap;
		},
		set lineCap ( cap ) {
			if ( isValidLineCap(cap) ) {
				currentStyle.lineCap = cap;
			}
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-linejoin
		// attribute DOMString lineJoin; // "round", "bevel", "miter" (default "miter")
		get lineJoin () {
			return currentStyle.lineJoin;
		},
		set lineJoin ( join ) {
			if ( isValidLineJoin(join) ) {
				currentStyle.lineJoin = join;
			}
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-miterlimit
		// attribute unrestricted double miterLimit; // (default 10)
		get miterLimit () {
			return currentStyle.miterLimit;
		},
		set miterLimit ( limit ) {
			currentStyle.miterLimit = limit;
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-font
		// attribute DOMString font; // (default 10px sans-serif)
		get font () {

		},
		set font ( aFont ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-textalign
		// attribute DOMString textAlign; // "start", "end", "left", "right", "center" (default: "start")
		get textAlign () {

		},
		set textAlign ( align ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-textbaseline
		// attribute DOMString textBaseline; // "top", "hanging", "middle", "alphabetic", "ideographic", "bottom" (default: "alphabetic")
		get textBaseline () {

		},
		set textBaseline ( baseLine ) {

		},
		// } interface CanvasDrawingStyles

		/*
		 +	 S H A D O W S
		 +
		 + + + + + + + + + + + + + + + */

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-shadowoffsetx
		// shadowOffsetX	float	 
		get shadowOffsetX () {

		},
		set shadowOffsetX ( sx ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-shadowoffsety
		// shadowOffsetY	float	
		get shadowOffsetY () {

		},
		set shadowOffsetY ( sy ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-shadowblur
		// shadowBlur	float	 
		get shadowBlur () {

		},
		set shadowBlur ( sb ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-shadowcolor
		// shadowColor	DOMString	
		get shadowColor () {

		},
		set shadowColor ( sc ) {

		},

		/*
		 +	 R E C T S
		 +
		 + + + + + + + + + + + + + + + */ 

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-clearrect
		// void clearRect (in float x, in float y, in float w, in float h);
		clearRect : function () {
			throw( 'Pixel operation, makes no sense for PDF vectors.' );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-fillrect
		// void fillRect (in float x, in float y, in float w, in float h);
		fillRect : function ( x, y, w, h ) {
			setStyleFromStack();
			jsPdf.rect( x, y, w, h, 'F' );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-strokerect
		// void strokeRect (in float x, in float y, in float w, in float h);
		strokeRect : function ( x, y, w, h ) {
			setStyleFromStack();
			jsPdf.rect( x, y, w, h, 'S' );
		},

		/*
		 +	 P A T H S
		 +
		 + + + + + + + + + + + + + + + */ 

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-beginpath
		// void beginPath ();
		beginPath : function () {
			shapeRecorder = new PDFContextShapeRecorder();
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-fill
		// void fill ();
		// fill(Path path);
		fill : function () {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-stroke
		// void stroke ();
		// void stroke(Path path);
		stroke : function () {

		},

		// void drawSystemFocusRing(Element element);
		// void drawSystemFocusRing(Path path, Element element);
		// boolean drawCustomFocusRing(Element element);
		// boolean drawCustomFocusRing(Path path, Element element);
		// void scrollPathIntoView();
		// void scrollPathIntoView(Path path);

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-clip
		// void clip();
		// void clip(Path path);
		clip : function () {
			throw( 'Not implemented yet' );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-ispointinpath
		// boolean isPointInPath(unrestricted double x, unrestricted double y);
		// boolean isPointInPath(Path path, unrestricted double x, unrestricted double y);
		isPointInPath : function () {
			throw( 'Not implemented yet' );
		},

		// interface CanvasPathMethods {

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-closepath
		// void closePath();
		closePath : function () {
			shapeRecorder.closePath();
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-moveto
		// void moveTo(unrestricted double x, unrestricted double y);
		moveTo : function ( x, y ) {
			shapeRecorder.moveTo( x, y );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-lineto
		// void lineTo(unrestricted double x, unrestricted double y);
		lineTo : function ( x, y ) {
			shapeRecorder.lineTo( x, y );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-quadraticcurveto
		// void quadraticCurveTo(unrestricted double cpx, unrestricted double cpy, unrestricted double x, unrestricted double y);
		quadraticCurveTo : function ( cpx, cpy, x, y ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-beziercurveto
		// void bezierCurveTo(unrestricted double cp1x, unrestricted double cp1y, unrestricted double cp2x, unrestricted double cp2y, unrestricted double x, unrestricted double y);
		bezierCurveTo : function ( cp1x, cp1y, cp2x, cp2y, x, y ) {
			shapeRecorder.bezierCurveTo( cp1x, cp1y, cp2x, cp2y, x, y );
		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-arcto
		// void arcTo(unrestricted double x1, unrestricted double y1, unrestricted double x2, unrestricted double y2, unrestricted double radius); 
		arcTo : function ( x1, y1, x2, y2, radius ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-rect
		// void rect(unrestricted double x, unrestricted double y, unrestricted double w, unrestricted double h);
		rect : function ( x, y, w, h ) {

		},

		// http://dev.w3.org/html5/2dcontext/#dom-context-2d-arc
		// void arc(unrestricted double x, unrestricted double y, unrestricted double radius, unrestricted double startAngle, unrestricted double endAngle, optional boolean anticlockwise = false); 
		arc : function ( x, y, radius, startAngle, endAngle, antiClockWise ) {

		},

		// } interface CanvasPathMethods

		/*
		 +	 T E X T S
		 +
		 + + + + + + + + + + + + + + + */ 

		// void fillText(DOMString text, unrestricted double x, unrestricted double y, optional unrestricted double maxWidth);
		fillText : function () {
			throw( 'Not implemented yet' );
		},

		// void strokeText(DOMString text, unrestricted double x, unrestricted double y, optional unrestricted double maxWidth);
		strokeText : function () {
			throw( 'Not implemented yet' );
		},

		// TextMetrics measureText(DOMString text);
		measureText : function () {
			throw( 'Not implemented yet' );
		},

		/*
		 +	 I M A G E S
		 +
		 + + + + + + + + + + + + + + + */ 

		// void drawImage((HTMLImageElement or HTMLCanvasElement or HTMLVideoElement) image, unrestricted double dx, unrestricted double dy);
		// void drawImage((HTMLImageElement or HTMLCanvasElement or HTMLVideoElement) image, unrestricted double dx, unrestricted double dy, unrestricted double dw, unrestricted double dh);
		// void drawImage((HTMLImageElement or HTMLCanvasElement or HTMLVideoElement) image, unrestricted double sx, unrestricted double sy, unrestricted double sw, unrestricted double sh, unrestricted double dx, unrestricted double dy, unrestricted double dw, unrestricted double dh);
		drawImage : function () {
			throw( 'Not implemented yet' );
		},

		/*
		 +	 H I T   R E G I O N S
		 +
		 + + + + + + + + + + + + + + + */ 

		// void addHitRegion(HitRegionOptions options);
		addHitRegion : function () {
			throw( 'Interactive features make no sense in a stitic PDF context' );
		},

		// void removeHitRegion(HitRegionOptions options);
		removeHitRegion : function () {
			throw( 'Interactive features make no sense in a stitic PDF context' );
		},

		/*
		 +	 P I X E L S ... really make no sense in PDF context.
		 +
		 + + + + + + + + + + + + + + + */ 

		// ImageData createImageData(unrestricted double sw, unrestricted double sh);
		// ImageData createImageData(ImageData imagedata);
		createImageData : function () {
			throw( 'Pixel operations make no sense in a PDF vector context' );
		},

		// ImageData getImageData(double sx, double sy, double sw, double sh);
		getImageData : function () {
			throw( 'Pixel operations make no sense in a PDF vector context' );
		},

		// void putImageData(ImageData imagedata, double dx, double dy, double dirtyX, double dirtyY, double dirtyWidth, double dirtyHeight);
		// void putImageData(ImageData imagedata, double dx, double dy);
		putImageData : function () {
			throw( 'Pixel operations make no sense in a PDF vector context' );
		}
	}

	var targetDomElement = null;
	var targetWidth = 0, targetHeight = 0;

	var pdfCanvas, pdfContext, jsPdf;

	/**
	 *	Class PDFCanvas
	 */
	var PDFCanvas = function () {
		// parsing arguments
		if ( arguments.length == 1 ) { // dom-node-id or dom-node
			if ( typeof arguments[0] === 'string' ) {
				targetDomElement = document.getElementById(arguments[0]);
			} else if ( typeof arguments[0] === 'object' ) {
				targetDomElement = arguments[0];
			}
			if ( !targetDomElement ) {
				throw( 'Unable to find target dom element from ' + arguments[0] );
			}
			targetWidth = targetDomElement.offsetWidth;
			targetHeight = targetDomElement.offsetHeight;
		} else if ( arguments.length == 2 ) { // width, height
			targetWidth  = parseInt( arguments[0] );
			targetHeight = parseInt( arguments[1] );
		}
		
		// initial setup
		pdfCanvas = this;
		pdfWidth = targetWidth;
		pdfHeight = targetHeight;

		jsPdf = new jsPDF(
			targetHeight > targetWidth ? 'portrait' : 'landscape',
			'pt',
			[targetWidth, targetHeight]
		);
	}
	PDFCanvas.prototype = {

		getContext : function (which) {
			if ( which.toString().toLowerCase() === '2d' ) {
				pdfContext = new PDFContext();
				return pdfContext;
			} else {
				throw( 'PDFCanvas only supports the 2D context' );
			}
		},

		toDataURL : function () {
			var type = arguments[0] || undefined;
			if ( type && type !== 'application/pdf' ) {
				throw( 'Can only output generated PDF to data-url of type "application/pdf".' );
			} else {
				return jsPdf.output('datauristring');
			}
		},

		toBlob : function () {
			throw( 'Not (yet) implemented.' );
		},

		get width () {
			return pdfWidth;
		},
		set width ( width ) {
			pdfWidth = parseInt( width );
		},

		get height () {
			return pdfHeight;
		},
		set height ( height ) {
			pdfHeight = parseInt( height );
		},

		test : function () {
			testColorConversion();
		}
	}
	return PDFCanvas;
})();