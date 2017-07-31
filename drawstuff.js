/* classes */ 


// Polygon class
class Polygon {
    
        // Polygon constructor
        // Expects two equally sized arrays in X and Y
        // Each xy pair is a 2D vertex, with first/last connected to close
        // Copies contents of passed arrays, not just pointers
    constructor(xArray,yArray) {
        try {
            if (!(xArray instanceof Array) || !(yArray instanceof Array))
                throw "polygon coordinates not an array";
            else if (xArray.length !== yArray.length) 
                throw "number of X & Y polygon coordinates do not match";
            else if (xArray.length < 3) 
                throw "described polygon is a line or point";
            else {
                this.xArray = xArray.slice(); 
                this.yArray = yArray.slice();
            }
        } // end try
        
        catch (e) {
            console.log(e);
        }
    } // end Polygon constructor
    
        // return a deep copy of the polygon
    clone() {
        theClone = new Polygon(this.xArray,this.yArray);
        return(theClone);
    } // end close
    
        // split the polygon into two new ones, given a line
        // assumes polygon is convex -> exactly two polygons result from split
        // expects a, b, c in ax + by + c = 0
        // returns array, empty if line doesn't intersect, else with two new polys
    split(a,b,c) { // FIX SO AREA ABOVE ALWAYS FIRST
        
            // find line edge intersect that splits
            // returns xy if intersect, null otherwise
        function findSplitIntersect(poly,vBegin,vEnd) {
            var xBegin = poly.xArray[vBegin], xEnd = poly.xArray[vEnd];
            var yBegin = poly.yArray[vBegin], yEnd = poly.yArray[vEnd];
            var edgeVertical = (xBegin == xEnd); 
            var lineVertical = (b == 0); 
            var isectX, isectY; // intersection's x & y coords
            
            console.log("Testing edge (" +xBegin+","+yBegin+ ") to (" +xEnd+" "+yEnd+ ")");
            
            if (lineVertical) 
                if (edgeVertical) // line and edge vertical
                    return(null); // PARALLEL: NO SPLIT
                else { // line vertical, edge not
                  isectX = -c/a; 
                  var interp = (isectX - xBegin) / (xEnd - xBegin);
                  isectY = yBegin + interp*(yEnd - yBegin);
                } // end if line vertical, edge not
            else if (edgeVertical) { // line not vertical, edge vertical
                isectX = xBegin; 
                isectY = ((-a*xBegin - c)/b);
            } else { // line and edge not vertical
                var me = (yEnd - yBegin) / (xEnd - xBegin); // edge slope
                var ml = -a/b; // line slope
                if (me == ml) // lines are parallel
                    return(null); // PARALLEL: NO SPLIT
                else { // line and edge are not parallel
                    var be = yBegin - me*xBegin; // edge intercept
                    var bl = -c/b; // line intercept
                    isectX = (be - bl) / (ml - me);
                    isectY = (ml*be - me*bl) / (ml - me); 
                } // end if line and edge not parallel
            } // end if line and edge not vertical
            
            if ((isectY == yBegin) && (isectX == xBegin))
                return(null); // ISECT AT BEGIN: NO SPLIT
            else if ((isectY == yEnd) && (isectX == xEnd)) {
                var beginSide = Math.sign(a*xBegin + b*yBegin + c);
                var vAfterEnd = (vEnd+1) % poly.xArray.length;
                var afterEndSide = Math.sign(a*poly.xArray[vAfterEnd] + b*poly.yArray[vAfterEnd] + c);
                console.log("beginSide: " +beginSide+ ", vAfter: " +vAfterEnd+ ", afterSide: " +afterEndSide);
                if ((beginSide == 0) || (afterEndSide == 0) || (beginSide == afterEndSide))
                    return(null); // ISECT AT END, DOESN'T CROSS: NO SPLIT
                else
                    return({x: xEnd, y: yEnd}); // ISECT AT END, CROSSES: SPLIT AT END 
            } else {
                var outsideEdge; // if intersect is outside edge
                if (yBegin == yEnd) // edge is horizontal: use x compare
                    outsideEdge = ((isectX < Math.min(xBegin,xEnd)) || (isectX > Math.max(xBegin,xEnd)));
                else // not horizontal: use y compare
                    outsideEdge = ((isectY < Math.min(yBegin,yEnd)) || (isectY > Math.max(yBegin,yEnd)));  
                if (outsideEdge)                   
                    return(null); // OUTSIDE HORIZ EDGE: NO SPLIT
                else 
                    return({x: isectX, y: isectY});
            } // end if intersect not at edge vertex
        } // end findSplitIntersect
        
        try {
            if ((typeof(a) !== "number") || (typeof(b) !== "number") || (typeof(c) !== "number"))
                throw "polygon split: passed line param not a number";
            else if ((a == 0) && (b == 0))
                throw "polygon split: passed line is just a point";
                // later add convexity test
            else {
                var vBegin = this.xArray.length - 1; // begin vertex is last poly vertex
                var p1XArray = [], p1YArray = []; // vertices of new poly 1
                var p2XArray = [], p2YArray = []; // vertices of new poly 2
                var p1PosSide = false; // if new poly 1 is one pos line side
                var currXArray = p1XArray, currYArray = p1YArray; // which new poly we add to
                var seekingIsect1 = true; // seeking first intersection
                var seekingIsect2 = false; // seeking second intersection
                var isectPoint; // the intersection point
                    
                    // move through poly edges, test for intersections, build two new polys
                for (var e=0; e<this.xArray.length; e++) { 
                    isectPoint = findSplitIntersect(this,vBegin,e);
                    if (isectPoint == null) { // if we didn't find an intersection
                        currXArray.push(this.xArray[e]);
                        currYArray.push(this.yArray[e]); 
                    } else { // if we did find an intersection
                        p1XArray.push(isectPoint.x); p1YArray.push(isectPoint.y);
                        p2XArray.push(isectPoint.x); p2YArray.push(isectPoint.y);
                        if (seekingIsect1) {
                           console.log("found isect1 at " +isectPoint.x+ "," +isectPoint.y);
                           currXArray = p2XArray; currYArray = p2YArray;
                           seekingIsect1 = false; seekingIsect2 = true; 
                        } else { // seeking isect 2
                           console.log("found isect2 at " +isectPoint.x+ "," +isectPoint.y);
                           currXArray = p1XArray; currYArray = p1YArray;
                           seekingIsect1 = true; seekingIsect2 = false;
                        } // end seeking isect 2
                        if ((isectPoint.x !== this.xArray[e]) || (isectPoint.y !== this.yArray[e]))  {
                            currXArray.push(this.xArray[e]);
                            currYArray.push(this.yArray[e]); 
                        } // end if intersect and end point are not same
                    } // end if an intersect found        
                    vBegin = e; // new begin vertex is prev end vertex
                    p1PosSide |= (seekingIsect1 && ((a*this.xArray[e] + b*this.yArray[e] + c) > 0)); 
                    console.log(p1PosSide ? "p1 positive" : "p1 negative");
                } // end for edges
                console.log("split poly1 x: " + p1XArray.toString());
                console.log("split poly1 y: " + p1YArray.toString());
                console.log("split poly2 x: " + p2XArray.toString());
                console.log("split poly2 y: " + p2YArray.toString());
                
                var p1Poly = new Polygon(p1XArray,p1YArray);
                var p2Poly = (p2XArray.length < 3) ? null : new Polygon(p2XArray,p2YArray); 
                if (p1PosSide) 
                    return([p1Poly, p2Poly]);
                else
                    return([p2Poly, p1Poly]);
            } // end if no exceptions
        } // end throw
         
        catch(e) {
            console.log(e);
        }
    } // end split
    
        // split polygon into two parts by proportional area
        // assumes polygon is convex -> two parts result from linear cut
        // expect a slope (Infinity -> vertical) and target normalized area a in (0,1)
        // returns two part poly split by line with passed slope, one part with 
        // approx normalized area a, the other approx area 1-a.
    splitByArea(a,m) { 
        var beginAreaLess, endAreaLess; // if split through edge vertices < a
        var al, bl, cl; // split line coefficients
        
        // compare area of positive side split poly through x,y to a
        // note that this function has a side effect on al bl cl that defines
        // split line equation
        function isSplitAreaLess(poly,x,y) { 
            const polyArea = poly.area(); // the area of the poly to split

            console.log("Trying to split at: " +x+ "," +y);
            // console.log("Poly area: " + polyArea);
            
            // set split line coefficients
            if (!isFinite(m)) { // infinite
                al = 1; bl = 0; cl = -x; 
            } else { // finite
                al = -m; bl = 1; 
                cl = -(y - m*x);
            } // end if finite
            
            // console.log("  Use line: " +al+" "+bl+" "+cl); 
            
            // get the area of split poly on positive side
            var area = poly.split(al,bl,cl);
            area = (area[0] == null) ? 0 : area[0].area() / polyArea;

            console.log("split area is: " + area);
            // console.log(area + (area<a ? " less than " : " greater than ") + a);
            
            return(area < a); 
        } // end is split area less
        
        try {
            if ((a <= 0) || (a >= 1))
                throw "split poly by area: target area not in (0,1)";
            else {
                var beginV, endV = 0; // edge vertex indices
                
                // look for an edge that straddles the ideal area
                endAreaLess = isSplitAreaLess(this,this.xArray[0],this.yArray[0]); 
                do {
                    beginV = endV;
                    beginAreaLess = endAreaLess; 
                    endV++; 
                    endAreaLess = isSplitAreaLess(this,this.xArray[endV],this.yArray[endV]);
                } while ((beginAreaLess == endAreaLess) && (endV < (this.xArray.length-1)));

                if (beginAreaLess == endAreaLess)
                    throw "unable to split poly by passed area";
                else { // found straddling edge
                    console.log("working with edge from (" +this.xArray[endV]+","+this.yArray[endV]+
                                ") to (" +this.xArray[beginV]+","+this.yArray[beginV]+ ")");
                   
                    // refine the intersect location to pixel accuracy within the straddling edge
                    var stepInY; // if we are stepping in Y
                    var stepArray; // dimension we should use for stepping (e.g. step in x)
                    var depArray; // dim that depends on stepping dim (e.g. y = f(x))
                    var depDelta; // straddling edge slope and dependent dim increment
                    if (this.xArray[endV] == this.xArray[beginV]) { // straddling edge vertical
                        console.log("straddle edge is vertical");
                        stepInY = true; 
                        stepArray = this.yArray;
                        depArray = this.xArray;
                        depDelta = 0; 
                    } else { // edge not vertical
                        var edgeSlope =    (this.yArray[endV]-this.yArray[beginV]) 
                                         / (this.xArray[endV]-this.xArray[beginV]);
                        stepInY = Math.abs(edgeSlope) > 1; 
                        if (stepInY) { // step in y
                            console.log("straddle edge is y stepped");
                            stepArray = this.yArray;
                            depArray = this.xArray;
                            depDelta = 1 / edgeSlope;
                        } else { // step in x
                            console.log("straddle edge is x stepped");
                            stepArray = this.xArray;
                            depArray = this.yArray;
                            depDelta = edgeSlope; 
                        } // end if step in x
                        console.log("edgeSlope is: " + edgeSlope);
                    } // end if edge not vertical
                    console.log("depDelta is: " + depDelta);
                    
                    var stepDir = Math.sign(stepArray[beginV] - stepArray[endV]); // direction along step axis
                    var stepCoord = stepArray[endV]; // starting stepping coord
                    var depCoord = depArray[endV]; // starting dependent coord
                    var foundSplitPixel; // if we have found the split pixel
                    var exitedEdge; // if we stepped outside the edge without finding split
                    var oldAl, oldBl, oldCl; // the last good refined split line
                    if (stepInY)
                        var stepAreaLess = function(poly) { return isSplitAreaLess(poly, depCoord, stepCoord); };
                    else
                        var stepAreaLess = function(poly) { return isSplitAreaLess(poly, stepCoord, depCoord); }; 
                    
                    do { 
                        oldAl = al; oldBl = bl; oldCl = cl; 
                        stepCoord += stepDir; depCoord += (stepDir * depDelta);
                        console.log("Testing in edge split at: "+(stepInY?depCoord:stepCoord)+" "+(stepInY?stepCoord:depCoord));
                        foundSplitPixel = (stepAreaLess(this) !== endAreaLess);
                        exitedEdge = (stepDir !== Math.sign(stepArray[beginV] - stepCoord));
                    } while (!foundSplitPixel && !exitedEdge);
                    
                    if (!foundSplitPixel) // when split not found, throw exception
                        throw "refined split not found within straddling edge";
                    else
                        return(this.split(oldAl,oldBl,oldCl));
                } // end found straddling edge
            } // end area param ok
        } // end try
        
        catch(e) {
            console.log(e);
        }
    } // end splitbyarea
    
        // returns the area of the polygon
        // lifted from http://www.mathopenref.com/coordpolygonarea2.html
    area() {
        var area = 0;
        var prevP = this.xArray.length-1;  // prev for vertex 1 is last

        for (var p=0; p<this.xArray.length; p++) { 
            area += (this.xArray[prevP]+this.xArray[p]) * (this.yArray[prevP]-this.yArray[p]); 
            prevP = p;  //j is previous vertex to i
        } // end for points
        return Math.abs(area/2);
    } // end area
    
        // true if passed polygon is same as this one
    equals(poly) {
        try {  
            /*if (!(poly instanceOf Polygon))
                throw "cannot compare polygon to non-polygon";
            else */if (this === poly) 
                return true; // poly is identical to this one
            else if (this.xArray.length !== poly.xArray.length)
                return false; // different numbers of x coords
            else if (this.yArray.length !== poly.yArray.length)
                return false; // different numbers of y coords
            else {
                for (var v=0; v<this.xArray.length; v++)
                    if (this.xArray[v] !== poly.xArray[v]) return false; // xcoords differ
                for (var v=0; v<this.xArray.length; v++)
                    if (this.yArray[v] !== poly.yArray[v]) return false; // ycoords differ
                return true; // x & y coords are same
            } // end if
        } // end try
        
        catch(e) {
            console.log(e); 
        }
    } // end equals
    
        // Draws the polygon
        // Expects a canvas' 2d drawing context
        // Optional parameters allow reset of canvas origin and axis reflection
    draw(context,ox=0,oy=0,rx=1,ry=1) {
        try {
            if ((typeof(ox) !== "number") || (typeof(oy) !== "number") || (typeof(rx) !== "number") || (typeof(ry) !== "number"))
                throw "polygon draw origin or reflection not a number";
            else if (((rx !== -1) && (rx !== 1)) || ((ry !== -1) && (ry !== 1)))
                throw "polygon reflection factor not -1 or 1";
            else {
                
                // set up origin and reflection 
                context.save();
                context.translate(ox,oy);
                context.scale(rx,ry); 
                
                // draw polygon
                context.fillStyle = 'black';
                context.strokeStyle = 'gray'; 
                context.lineWidth = 3;
                context.beginPath();
                
                var lastVert = this.xArray.length-1; 
                context.moveTo(this.xArray[lastVert],this.yArray[lastVert]);
                for (var p=0; p<this.xArray.length; p++) {
                    context.lineTo(this.xArray[p],this.yArray[p]);
                } // end for points
                
                context.fill();
                context.stroke();
                context.restore();
            } // end if
        } // end try
        
        catch (e) {
            console.log(e);
        } 
    } // end draw
    
} // end Polygon class


// PolygonTree class
// Polygons can contain multiple subpolys, when split by one or more (parallel) lines
class PolygonTree {
    
        // PolygonTree constructor
        // Creates a root node with the passed poly
        // Passed poly is cloned, not just pointed to
    constructor(poly) {
        try {
            if (!(poly instanceof Polygon)) 
                throw "root polygon of tree is not a polygon";
            else {
                this.poly = poly.clone(); // the polygon in this node
                this.cutSlope = null;  // the slope used to cut this node
                this.cutIntercepts = []; // the locations of cut lines
                this.parent = null; // parent of this node
                this.children = []; // children of this node
            } // end if
        } // end try
        
        catch(e) {
            console.log(e);
        }
    } // end constructor

        // Polygon
} // end PolygonTree class


// Color class
class Color {
    
        // Color constructor default opaque black
    constructor(r=0,g=0,b=0,a=255) {
        try {
            if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                throw "color component not a number";
            else if ((r<0) || (g<0) || (b<0) || (a<0)) 
                throw "color component less than 0";
            else if ((r>255) || (g>255) || (b>255) || (a>255)) 
                throw "color component bigger than 255";
            else {
                this.r = r; this.g = g; this.b = b; this.a = a; 
            }
        } // end try
        
        catch (e) {
            console.log(e);
        }
    } // end Color constructor

        // Color change method
    change(r,g,b,a) {
        try {
            if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                throw "color component not a number";
            else if ((r<0) || (g<0) || (b<0) || (a<0)) 
                throw "color component less than 0";
            else if ((r>255) || (g>255) || (b>255) || (a>255)) 
                throw "color component bigger than 255";
            else {
                this.r = r; this.g = g; this.b = b; this.a = a; 
                return(this);
            }
        } // end throw
        
        catch (e) {
            console.log(e);
        }
    } // end Color change method
    
        // Color add method
    add(c) {
        try {
            if (!(c instanceof Color))
                throw "Color.add: non-color parameter";
            else {
                this.r += c.r; this.g += c.g; this.b += c.b; this.a += c.a;
                return(this);
            }
        } // end try
        
        catch(e) {
            console.log(e);
        }
    } // end color add
    
        // Color subtract method
    subtract(c) {
        try {
            if (!(c instanceof Color))
                throw "Color.subtract: non-color parameter";
            else {
                this.r -= c.r; this.g -= c.g; this.b -= c.b; this.a -= c.a;
                return(this);
            }
        } // end try
        
        catch(e) {
            console.log(e);
        }
    } // end color subgtract
    
        // Color scale method
    scale(s) {
        try {
            if (typeof(s) !== "number")
                throw "scale factor not a number";
            else {
                this.r *= s; this.g *= s; this.b *= s; this.a *= s; 
                return(this);
            }
        } // end throw
        
        catch (e) {
            console.log(e);
        }
    } // end Color scale method
    
        // Color copy method
    copy(c) {
        try {
            if (!(c instanceof Color))
                throw "Color.copy: non-color parameter";
            else {
                this.r = c.r; this.g = c.g; this.b = c.b; this.a = c.a;
                return(this);
            }
        } // end try
        
        catch(e) {
            console.log(e);
        }
    } // end Color copy method
    
        // Color clone method
    clone() {
        var newColor = new Color(); // hmm: is this only local?
        newColor.copy(this);
        return(newColor);
    } // end Color clone method
    
        // Send color to console
    toConsole() {
        console.log(this.r +" "+ this.g +" "+ this.b +" "+ this.a);
    }  // end Color toConsole
    
} // end color class


/* main -- here is where execution begins after window load */

function main() {

    // Get the canvas, context, and image data
    var canvas = document.getElementById("viewport"); 
    var context = canvas.getContext("2d");
    var w = context.canvas.width; // as set in html
    var h = context.canvas.height;  // as set in html
 
    // Define a circle polygon with n sides
    /* var n = 4; 
    var r = 150; 
    var incr = 2* Math.PI / n;
    var xArray = [], yArray = []; 
    for (var a=0; a<2*Math.PI; a+=incr) {
        xArray.push(Math.round(r*Math.cos(a))); 
        yArray.push(Math.round(r*Math.sin(a)));
    } // end for sides
    var poly = new Polygon(xArray,yArray); */ 
    
    // define a triangle polygon
    // var poly = new Polygon(new Array(-100,50,200),new Array(-150,150,-150)); 
    
    // define an axis aligned square
    var poly = new Polygon(new Array(-150,-150, 150, 150),new Array(-150, 150, 150, -150)); 
    
    // draw the polygon
    // poly.draw(context,w/2,h/2,1,-1);
    // console.log(poly.area());
    
    console.log("test poly x: " + poly.xArray.toString());
    console.log("test poly y: " + poly.yArray.toString()); 

    // split the polygon
    var splitResult = poly.splitByArea(0.75,Infinity);
    splitResult[0].draw(context,w/2,h/2,1,-1);
    splitResult[1].draw(context,w/2,h/2,1,-1);
} // end main
