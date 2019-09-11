// Main js

var FILENAME = "my_data.csv";

var img1, img2;
var img11, img22;
var alp = 1.0;

var canvas;
var context;

var highlight;
var hl_context;

var fps = 60;

var updateRequired = false;
var busy = false;

const EPSILON = 1e-6;

var categories = [];

var genData = [

];

var order = [];
var chk = [];

var total;
var datas = [];

var clicked = false;
var stack = [];

var tree;

var curLevel;

var hlNode = null;
var selectEdge = null;
var selectTree = true;

var inDraw = false;

var maxLeafArea = 0;
var minLeafArea = Infinity;

var leaves = [];

var marbles = [];
var global_mi = 0;
var marbleR = 3;

var noMarble = false;

var iD = [0, 6, 8];

var lastT;
var delT;

var formF;

function back(){
    var top = stack.length - 1;
    for(var i = 0; i < stack[top][0].length; ++i){
        genData[i] = stack[top][0][i].slice(0);
    }
    datas = stack[top][1].slice(0);
    total = stack[top][2];
    stack.pop();

    updateRequired = true;

    if(stack.length == 0){
        $("#back").remove();
    }
}

function calcForce(idst, ox, oy, dx, dy, mm) {
    var dst = Math.sqrt((ox - dx) * (ox - dx) + (oy - dy) * (oy - dy));

    if (mm !== 0 && dst > idst) return [0, 0];

    var mag = dst - idst;

    var ang = Math.atan2(oy - dy, ox - dx);

    return [mag * Math.cos(ang), mag * Math.sin(ang)];
}

function distributeMarbles() {
    var new_mi;
    for (var p = 0; p < leaves.length; ++p) {
        var poly = leaves[p];
        new_mi = global_mi + Math.round(poly.area() / tree.poly.area() * 100.0);

        if(new_mi > marbles.length){
            for (var i = marbles.length; i < new_mi; ++i) {
                marbles.push(new Marble((i / 10 - 5) * marbleR * 4, (i % 10 - 5) * marbleR * 4));
            }
        }

        for (var i = global_mi; i < new_mi; ++i) {
            var ret = poly.findClosest(i);
            marbles = marbles.slice(0, i).concat(marbles.slice(ret[0], ret[0] + 1)).concat(marbles.slice(i, ret[0])).concat(marbles.slice(ret[0] + 1));
            marbles[i].C = ret[1];
            marbles[i].poly = poly;
        }
        leaves[p].mi = [global_mi, new_mi];
        global_mi = new_mi;
    }
    if(marbles.length > new_mi) marbles = marbles.slice(0, new_mi);
}

function updateMarbles() {
    for (var i = 0; i < global_mi; ++i) {
        marbles[i].vx = marbles[i].vy = 0;
        for (var j = 0; j < global_mi; ++j) {
            if (i == j) continue;
            var v = [0, 0];
            if (marbles[i].poly == marbles[j].poly) {
                v = calcForce(iD[1] * marbleR, marbles[j].x, marbles[j].y, marbles[i].x, marbles[i].y, 1);
            } else {
                v = calcForce(iD[2] * marbleR, marbles[j].x, marbles[j].y, marbles[i].x, marbles[i].y, 2);
            }
            marbles[i].vx += v[0];
            marbles[i].vy += v[1];
        }
    }

    for (var p = 0; p < leaves.length; ++p) {
        var poly = leaves[p];

        for (var i = poly.mi[0]; i < poly.mi[1]; ++i) {
            var v = calcForce(iD[0] * marbleR, poly.ptx[marbles[i].C], poly.pty[marbles[i].C], marbles[i].x, marbles[i].y, 0);
            marbles[i].vx += v[0];
            marbles[i].vy += v[1];
        }
    }

    for (var i = 0; i < global_mi; ++i) {
        marbles[i].update();
    }
}

function drawMarbles() {
    if (noMarble) return;
    for (var i = 0; i < global_mi; ++i) {
        marbles[i].draw(context, context.canvas.width / 2, context.canvas.height / 2, -1, -1);
    }
}

function hslToRgb(h, s, l) {
    var r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        var hue2rgb = function hue2rgb(p, q, t) {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

/* classes */

// Marble class
class Marble {
    constructor(x, y) {
        this.x = x;
        this.y = y;

        this.vx = 0;
        this.vy = 0;

        this.r = marbleR;
        this.poly = null;

        this.cx = this.cy = null;
        this.C = null;
    }

    update() {
        this.x += this.vx * delT;
        this.y += this.vy * delT;
    }

    draw(context, ox = 0, oy = 0, rx = 1, ry = 1) {
        context.save();
        context.translate(ox, oy);
        context.scale(rx, ry);

        context.fillStyle = 'black';
        context.beginPath();
        context.arc(this.x, this.y, this.r, 0, 2 * Math.PI);
        context.fill();

        context.restore();
    }

    isInside() {
        return this.poly.isInside(this.x, this.y);
    }
}

// Polygon class
class Polygon {

    // Polygon constructor
    // Expects two equally sized arrays in X and Y
    // Each xy pair is a 2D vertex, with first/last connected to close
    // Copies contents of passed arrays, not just pointers
    constructor(xArray, yArray) {
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

                    this.cx = 0;
                    this.cy = 0;

                    for (var i = 0; i < this.xArray.length; ++i) {
                        this.cx += this.xArray[i];
                        this.cy += this.yArray[i];
                    }

                    this.cx /= this.xArray.length;
                    this.cy /= this.yArray.length;

                    this.mi = null;

                    this.ptx = [this.cx];
                    this.pty = [this.cy];
                    this.ptc = [0];
                }
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end Polygon constructor

    // return a deep copy of the polygon
    clone() {
            var theClone = new Polygon(this.xArray, this.yArray);
            return (theClone);
        } // end close

    static nearlyEqual(x, y) {
            return (Math.abs(x - y) < EPSILON);
        } // end nearlyEqual

    isInside(x, y) {
        var lastVert = this.xArray.length - 1;
        for (var p = 0; p < this.xArray.length; p++) {
            var x1 = this.xArray[p] - this.xArray[lastVert];
            var y1 = this.yArray[p] - this.yArray[lastVert];
            var x2 = x - this.xArray[lastVert];
            var y2 = y - this.yArray[lastVert];
            if (x1 * y2 - y1 * x2 < EPSILON) return false;
            lastVert = p;
        }
        return true;
    }

    genPT() {
        var minx = Infinity;
        var miny = Infinity;
        var maxx = -Infinity;
        var maxy = -Infinity;

        for (var i = 0; i < this.xArray.length; ++i) {
            minx = Math.min(minx, this.xArray[i]);
            miny = Math.min(miny, this.yArray[i]);
            maxx = Math.max(maxx, this.xArray[i]);
            maxy = Math.max(maxy, this.yArray[i]);
        }

        var T = Math.ceil(Math.round(this.area() / tree.poly.area() * 100.0) / 5);

        for (var c = T; c > 1; --c) {
            var x, y;
            var i, j;
            var d;
            var maxD = -Infinity;
            var ox, oy;
            for (var cc = 0; cc < 1000; ++cc) {
                x = Math.random() * (maxx - minx) + minx;
                y = Math.random() * (maxy - miny) + miny;

                var minD = Infinity;
                for (j = 0; j < this.ptx.length; ++j) {
                    d = ((x - this.ptx[j]) * (x - this.ptx[j]) + (y - this.pty[j]) * (y - this.pty[j])) / 4;
                    if (d < minD) minD = d;
                }

                for (i = 0, j = 1; i < this.xArray.length; ++i, j = (j + 1) % this.xArray.length) {
                    d = edgeDstSqr(x, y, this, i, j);
                    if (d < minD) minD = d;
                }

                minD = Math.sqrt(minD);

                if (this.isInside(x, y)) {
                    if (minD > iD[1] * marbleR) {
                        ox = x;
                        oy = y;
                        break;
                    } else if (minD > maxD) {
                        maxD = minD;
                        ox = x;
                        oy = y;
                    }
                }
            }
            this.ptx.push(ox);
            this.pty.push(oy);
            this.ptc.push(0);
        }
    }

    findClosest(i) {
        var ret;

        var j;
        for (j = 0; j < this.ptc.length; ++j)
            if (this.ptc[j] < 5) break;

        var minD = Infinity;

        for (; i < marbles.length; ++i) {
            var d = (marbles[i].x - this.ptx[j]) * (marbles[i].x - this.ptx[j]) + (marbles[i].y - this.pty[j]) * (marbles[i].y - this.pty[j]);
            if (d < minD) minD = d, ret = i;
        }

        ++this.ptc[j];

        return [ret, j];
    }

    // split the polygon into two new ones, given a line
    // assumes polygon is convex -> exactly two polygons result from split
    // expects a, b, c in ax + by + c = 0
    // returns array, empty if line doesn't intersect, else with two new polys
    split(a, b, c) {

            // test for equality but allow some imprecision
            // equal if within a small constant value
            // find line edge intersect that splits
            // returns xy if intersect, null otherwise
            function findSplitIntersect(poly, vBegin, vEnd) {
                var xBegin = poly.xArray[vBegin],
                    xEnd = poly.xArray[vEnd];
                var yBegin = poly.yArray[vBegin],
                    yEnd = poly.yArray[vEnd];
                var edgeVertical = (xBegin == xEnd);
                var lineVertical = (b == 0);
                var isectX = NaN,
                    isectY = NaN; // intersection's x & y coords

                //console.log("Testing edge (" + xBegin + "," + yBegin + ") to (" + xEnd + " " + yEnd + ")");

                if (lineVertical) {
                    if (edgeVertical) // line and edge vertical
                        return (null); // PARALLEL: NO SPLIT
                    else { // line vertical, edge not
                        isectX = -c / a;
                        var interp = (isectX - xBegin) / (xEnd - xBegin);
                        isectY = yBegin + interp * (yEnd - yBegin);
                    } // end if line vertical, edge not
                } else if (edgeVertical) { // line not vertical, edge vertical
                    isectX = xBegin;
                    isectY = ((-a * xBegin - c) / b);
                } else { // line and edge not vertical
                    var me = (yEnd - yBegin) / (xEnd - xBegin); // edge slope
                    var ml = -a / b; // line slope
                    if (Polygon.nearlyEqual(me, ml)) // lines are parallel
                        return (null); // PARALLEL: NO SPLIT
                    else { // line and edge are not parallel
                        var be = yBegin - me * xBegin; // edge intercept
                        var bl = -c / b; // line intercept
                        isectX = (be - bl) / (ml - me);
                        isectY = (ml * be - me * bl) / (ml - me);
                    } // end if line and edge not parallel
                } // end if line and edge not vertical

                //console.log("isect point: (" + isectX + "," + isectY + ")");

                if (Polygon.nearlyEqual(isectY, yBegin) && Polygon.nearlyEqual(isectX, xBegin))
                    return (null); // ISECT AT BEGIN: NO SPLIT
                else if (Polygon.nearlyEqual(isectY, yEnd) && Polygon.nearlyEqual(isectX, xEnd)) {
                    var beginSide = Math.sign(a * xBegin + b * yBegin + c);
                    var vAfterEnd = (vEnd + 1) % poly.xArray.length;
                    var afterEndSide = Math.sign(a * poly.xArray[vAfterEnd] + b * poly.yArray[vAfterEnd] + c);
                    //console.log("beginSide: " + beginSide + ", vAfter: " + vAfterEnd + ", afterSide: " + afterEndSide);
                    if ((beginSide == 0) || (afterEndSide == 0) || (beginSide == afterEndSide))
                        return (null); // ISECT AT END, DOESN'T CROSS: NO SPLIT
                    else
                        return ({ x: xEnd, y: yEnd }); // ISECT AT END, CROSSES: SPLIT AT END
                } else {
                    var outsideEdge; // if intersect is outside edge
                    if (Polygon.nearlyEqual(yBegin, yEnd)) // edge is horizontal: use x compare
                        outsideEdge = ((isectX < Math.min(xBegin, xEnd) - EPSILON) || (isectX > Math.max(xBegin, xEnd) + EPSILON));
                    else // not horizontal: use y compare
                        outsideEdge = ((isectY < Math.min(yBegin, yEnd) - EPSILON) || (isectY > Math.max(yBegin, yEnd) + EPSILON));
                    if (outsideEdge)
                        return (null); // OUTSIDE HORIZ EDGE: NO SPLIT
                    else
                        return ({ x: isectX, y: isectY });
                } // end if intersect not at edge vertex
            } // end findSplitIntersect

            try {
                if ((typeof(a) !== "number") || (typeof(b) !== "number") || (typeof(c) !== "number"))
                    throw "polygon split: passed line param not a number";
                else if ((a == 0) && (b == 0))
                    throw "polygon split: passed line is just a point";
                // later add convexity test
                else {
                    var orgSide = a * tree.poly.xArray[curLevel] + b * tree.poly.yArray[curLevel] + c;

                    var vBegin = this.xArray.length - 1; // begin vertex is last poly vertex
                    var p1XArray = [],
                        p1YArray = []; // vertices of new poly 1
                    var p2XArray = [],
                        p2YArray = []; // vertices of new poly 2
                    var p1PosSide = false; // if new poly 1 is one pos line side
                    var currXArray = p1XArray,
                        currYArray = p1YArray; // which new poly we add to
                    var seekingIsect1 = true; // seeking first intersection
                    var seekingIsect2 = false; // seeking second intersection
                    var isectPoint; // the intersection point

                    // move through poly edges, test for intersections, build two new polys
                    for (var e = 0; e < this.xArray.length; e++) {
                        isectPoint = findSplitIntersect(this, vBegin, e);
                        if (isectPoint == null) { // if we didn't find an intersection
                            currXArray.push(this.xArray[e]);
                            currYArray.push(this.yArray[e]);
                        } else { // if we did find an intersection
                            p1XArray.push(isectPoint.x);
                            p1YArray.push(isectPoint.y);
                            p2XArray.push(isectPoint.x);
                            p2YArray.push(isectPoint.y);
                            if (seekingIsect1) {
                                //console.log("found isect1 at " + isectPoint.x + "," + isectPoint.y);
                                currXArray = p2XArray;
                                currYArray = p2YArray;
                                seekingIsect1 = false;
                                seekingIsect2 = true;
                            } else { // seeking isect 2
                                //console.log("found isect2 at " + isectPoint.x + "," + isectPoint.y);
                                currXArray = p1XArray;
                                currYArray = p1YArray;
                                seekingIsect1 = true;
                                seekingIsect2 = false;
                            } // end seeking isect 2
                            if ((isectPoint.x !== this.xArray[e]) || (isectPoint.y !== this.yArray[e])) {
                                currXArray.push(this.xArray[e]);
                                currYArray.push(this.yArray[e]);
                            } // end if intersect and end point are not same
                        } // end if an intersect found        
                        vBegin = e; // new begin vertex is prev end vertex
                        p1PosSide |= (seekingIsect1 && ((a * this.xArray[e] + b * this.yArray[e] + c) * orgSide > 0));
                        //console.log(p1PosSide ? "p1 positive" : "p1 negative");
                    } // end for edges
                    //console.log("split poly1 x: " + p1XArray.toString());
                    //console.log("split poly1 y: " + p1YArray.toString());
                    //console.log("split poly2 x: " + p2XArray.toString());
                    //console.log("split poly2 y: " + p2YArray.toString());

                    var p1Poly = (p1XArray.length < 3) ? null : new Polygon(p1XArray, p1YArray);
                    var p2Poly = (p2XArray.length < 3) ? null : new Polygon(p2XArray, p2YArray);

                    if (p1PosSide)
                        return ([p1Poly, p2Poly]);
                    else
                        return ([p2Poly, p1Poly]);
                } // end if no exceptions
            } // end throw
            catch (e) {
                //console.log(e);
            }
        } // end split

    // split polygon into two parts by proportional area
    // assumes polygon is convex -> two parts result from linear cut
    // expect a slope (Infinity -> vertical) and target normalized area a in (0,1)
    // returns two part poly split by line with passed slope, one part with 
    // approx normalized area a, the other approx area 1-a.
    splitByArea(a, m) {
            var beginAreaLess, endAreaLess; // if split through edge vertices < a
            var al, bl, cl; // split line coefficients

            // compare area of positive side split poly through x,y to a
            // note that this function has a side effect on al bl cl that defines
            // split line equation
            function isSplitAreaLess(poly, x, y) {
                const polyArea = poly.area(); // the area of the poly to split

                // set split line coefficients
                if (!isFinite(m)) { // infinite
                    al = 1;
                    bl = 0;
                    cl = -x;
                } else { // finite
                    al = -m;
                    bl = 1;
                    cl = -(y - m * x);
                } // end if finite

                // console.log("  Use line: " +al+" "+bl+" "+cl); 

                // get the area of split poly on positive side
                var area = poly.split(al, bl, cl);
                area = (area[0] == null) ? 0 : area[0].area() / polyArea;

                //console.log("split area is: " + area);
                // console.log(area + (area<a ? " less than " : " greater than ") + a);

                return (area < a);
            } // end is split area less

            try {
                if ((a <= 0) || (a > 1))
                    throw "split poly by area: target area not in (0,1)";
                else {
                    var beginV, endV = 0; // edge vertex indices
                    for (var loop = 0; loop < this.xArray.length; ++loop) {
                        // look for an edge that straddles the ideal area
                        //console.log('\n' + "Trying to split at: " + this.xArray[0] + "," + this.yArray[0]);
                        do {
                            beginV = endV;
                            beginAreaLess = isSplitAreaLess(this, this.xArray[beginV], this.yArray[beginV]);
                            endV++;
                            if (endV == this.xArray.length) endV = 0;
                            //console.log('\n' + "Trying to split at: " + this.xArray[endV] + "," + this.yArray[endV]);
                            endAreaLess = isSplitAreaLess(this, this.xArray[endV], this.yArray[endV]);
                        } while ((beginAreaLess == endAreaLess) && (endV != 0));

                        if (beginAreaLess == endAreaLess)
                            throw "unable to split poly by passed area";
                        else { // found straddling edge
                            //console.log("\n\nworking with edge from (" + this.xArray[endV] + "," + this.yArray[endV] + ") to (" + this.xArray[beginV] + "," + this.yArray[beginV] + ")");


                            // refine the intersect location to pixel accuracy within the straddling edge
                            var stepInY; // if we are stepping in Y
                            var stepArray; // dimension we should use for stepping (e.g. step in x)
                            var depArray; // dim that depends on stepping dim (e.g. y = f(x))
                            var depDelta; // straddling edge slope and dependent dim increment
                            if (this.xArray[endV] == this.xArray[beginV]) { // straddling edge vertical
                                //console.log("straddle edge is vertical");
                                stepInY = true;
                                stepArray = this.yArray;
                                depArray = this.xArray;
                                depDelta = 0;
                            } else { // edge not vertical
                                var edgeSlope = (this.yArray[endV] - this.yArray[beginV]) /
                                    (this.xArray[endV] - this.xArray[beginV]);
                                stepInY = Math.abs(edgeSlope) > 1;
                                if (stepInY) { // step in y
                                    //console.log("straddle edge is y stepped");
                                    stepArray = this.yArray;
                                    depArray = this.xArray;
                                    depDelta = 1 / edgeSlope;
                                } else { // step in x
                                    //console.log("straddle edge is x stepped");
                                    stepArray = this.xArray;
                                    depArray = this.yArray;
                                    depDelta = edgeSlope;
                                } // end if step in x
                                //console.log("edgeSlope is: " + edgeSlope);
                            } // end if edge not vertical
                            //console.log("depDelta is: " + depDelta);

                            var stepDir = Math.sign(stepArray[endV] - stepArray[beginV]); // direction along step axis
                            var stepCoord = stepArray[beginV]; // starting stepping coord
                            var depCoord = depArray[beginV]; // starting dependent coord
                            var foundSplitPixel; // if we have found the split pixel
                            var exitedEdge; // if we stepped outside the edge without finding split

                            var splitPolys = this.split(al, bl, cl); // the two split polys

                            if (stepInY)
                                var stepAreaLess = function(poly) { return isSplitAreaLess(poly, depCoord, stepCoord); };
                            else
                                var stepAreaLess = function(poly) { return isSplitAreaLess(poly, stepCoord, depCoord); };

                            // todo: replace with binary search
                            // loop pixel by pixel within the straddling edge

                            beginAreaLess = isSplitAreaLess(this, this.xArray[beginV], this.yArray[beginV]);
                            endAreaLess = isSplitAreaLess(this, this.xArray[endV], this.yArray[endV]);

                            var hi = Math.abs(stepArray[endV] - stepArray[beginV]);
                            var lo = 0;
                            var mid;

                            while (Math.abs(hi - lo) > EPSILON) {
                                splitPolys = this.split(al, bl, cl);

                                var a1 = -1,
                                    a2 = -1;
                                if (splitPolys[0] !== null) a1 = splitPolys[0].area() / this.area();
                                if (splitPolys[1] !== null) a2 = splitPolys[1].area() / this.area();

                                mid = (lo + hi) / 2;

                                stepCoord = stepArray[beginV] + stepDir * mid;
                                depCoord = depArray[beginV] + stepDir * mid * depDelta;

                                //foundSplitPixel = (stepAreaLess(this) !== endAreaLess);
                                //exitedEdge = (stepDir !== Math.sign(stepArray[curEn] - stepCoord));

                                if (stepAreaLess(this) == beginAreaLess) {
                                    lo = mid;
                                } else {
                                    hi = mid;
                                }
                            }

                            if (splitPolys[0] !== null && Polygon.nearlyEqual(a, splitPolys[0].area() / this.area()))
                                return ([splitPolys[0], splitPolys[1]]);
                            else if (splitPolys[1] !== null && Polygon.nearlyEqual(a, splitPolys[1].area() / this.area()))
                                return ([splitPolys[1], splitPolys[0]]);
                        }
                    } // end found straddling edge
                } // end area param ok
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end splitbyarea

    // returns the area of the polygon
    // lifted from http://www.mathopenref.com/coordpolygonarea2.html
    area() {
            var area = 0;
            var prevP = this.xArray.length - 1; // prev for vertex 1 is last

            for (var p = 0; p < this.xArray.length; p++) {
                area += this.xArray[prevP] * this.yArray[p] - this.yArray[prevP] * this.xArray[p];
                prevP = p; //j is previous vertex to i
            } // end for points
            return Math.abs(area / 2.0);
        } // end area

    // true if passed polygon is same as this one
    equals(poly) {
            try {
                /*if (!(poly instanceOf Polygon))
                    throw "cannot compare polygon to non-polygon";
                else */
                if (this === poly)
                    return true; // poly is identical to this one
                else if (this.xArray.length !== poly.xArray.length)
                    return false; // different numbers of x coords
                else if (this.yArray.length !== poly.yArray.length)
                    return false; // different numbers of y coords
                else {
                    for (var v = 0; v < this.xArray.length; v++)
                        if (this.xArray[v] !== poly.xArray[v]) return false; // xcoords differ
                    for (var v = 0; v < this.xArray.length; v++)
                        if (this.yArray[v] !== poly.yArray[v]) return false; // ycoords differ
                    return true; // x & y coords are same
                } // end if
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end equals

    // Draws the polygon
    // Expects a canvas' 2d drawing context
    // Optional parameters allow reset of canvas origin and axis reflection
    draw(context, ox = 0, oy = 0, rx = 1, ry = 1, treeNode) {
            try {
                if ((typeof(ox) !== "number") || (typeof(oy) !== "number") || (typeof(rx) !== "number") || (typeof(ry) !== "number"))
                    throw "polygon draw origin or reflection not a number";
                /*else if (((rx !== -1) && (rx !== 1)) || ((ry !== -1) && (ry !== 1)))
                    throw "polygon reflection factor not -1 or 1";*/
                else {
                    // set up origin and reflection 
                    context.save();
                    context.translate(ox, oy);
                    context.scale(rx, ry);

                    var aH = 0.5;
                    var aS = Math.min(((this.area() - minLeafArea) / (maxLeafArea - minLeafArea)) * .75 + .25, 1);
                    var aL = 0.5;

                    var aHSL_RGB = hslToRgb(aH, aS, aL);
                    this.aRGB = new Color(aHSL_RGB[0], aHSL_RGB[1], aHSL_RGB[2]);

                    // draw polygon
                    context.fillStyle = this.aRGB.toString();
                    //context.strokeStyle = 'gray';
                    context.lineWidth = 0;
                    context.beginPath();

                    var lastVert = this.xArray.length - 1;
                    context.moveTo(this.xArray[lastVert], this.yArray[lastVert]);
                    for (var p = 0; p < this.xArray.length; p++) {
                        context.lineTo(this.xArray[p], this.yArray[p]);
                        lastVert = p;
                    } // end for points

                    if (treeNode.children.length == 0) context.fill();
                    //context.stroke();
                    context.restore();

                    context.save();
                    context.translate(ox, oy);
                    context.scale(rx, ry);

                    context.clip();

                    context.lineWidth = 8;

                    if (context !== hl_context && treeNode == hlNode) {
                        context.lineWidth += 4;
                    }

                    var seq = [];
                    for (var i = 0; i < order.length; ++i) seq.push([]);

                    var lastVert = this.xArray.length - 1;
                    for (var p = 0; p < this.xArray.length; p++) {
                        var curSlope = (this.yArray[p] - this.yArray[lastVert]) / (this.xArray[p] - this.xArray[lastVert]);

                        var i, j;
                        for (i = 0; i < tree.cutSlopes.length; ++i) {
                            if (Polygon.nearlyEqual(curSlope, tree.cutSlopes[i])) break;
                        }

                        seq[i].push(lastVert);

                        lastVert = p;
                    }

                    for (var k = seq.length - 1; k >= 0; --k) {
                        for (var l = 0; l < seq[k].length; ++l) {
                            lastVert = seq[k][l];
                            if (lastVert == null) continue;
                            p = (lastVert + 1) % this.xArray.length;

                            var eHSL = tree.eHSL[k].slice();

                            var ind = order[k];
                            for (i = 0; i < genData[ind].length; ++i) {
                                for (j = 0; j < treeNode.label.length; ++j) {
                                    if (treeNode.label[j] == genData[ind][i]) break;
                                }
                                if (j < treeNode.label.length) break;
                            }
                            if (i < genData[ind].length) eHSL[2] += (0.3 / (genData[ind].length - 1)) * i;

                            var store = context.lineWidth;
                            context.lineWidth -= (4 / (order.length - 1)) * k;

                            var eHSL_RGB = hslToRgb(eHSL[0], eHSL[1], eHSL[2]);
                            var eRGB = new Color(eHSL_RGB[0], eHSL_RGB[1], eHSL_RGB[2]);

                            context.strokeStyle = eRGB.toString();

                            context.beginPath();
                            context.moveTo(this.xArray[lastVert], this.yArray[lastVert]);
                            context.lineTo(this.xArray[p], this.yArray[p]);
                            context.stroke();

                            context.lineWidth = store;
                        }
                    } // end for points

                    context.restore();

                    if (context !== hl_context) {
                        context.save();
                        context.translate(ox, oy);
                        context.scale(rx, ry);

                        if (curCandidate !== null) {
                            var eHSL = tree.eHSL[curCandidate];
                            var eHSL_RGB = hslToRgb(eHSL[0], eHSL[1], eHSL[2]);
                            var eRGB = new Color(eHSL_RGB[0], eHSL_RGB[1], eHSL_RGB[2]);

                            context.lineWidth = 8;
                            context.strokeStyle = eRGB.toString();

                            context.beginPath();
                            context.moveTo(tree.poly.xArray[curCandidate], tree.poly.yArray[curCandidate]);
                            context.lineTo(tree.poly.xArray[(curCandidate + 1) % tree.poly.xArray.length], tree.poly.yArray[(curCandidate + 1) % tree.poly.xArray.length]);
                            context.stroke();
                        }

                        if (oldCandidate !== null) {
                            var eHSL = tree.eHSL[oldCandidate];
                            var eHSL_RGB = hslToRgb(eHSL[0], eHSL[1], eHSL[2]);
                            var eRGB = new Color(eHSL_RGB[0], eHSL_RGB[1], eHSL_RGB[2]);

                            var x1 = tree.poly.xArray[oldCandidate];
                            var y1 = tree.poly.yArray[oldCandidate];
                            var x2 = tree.poly.xArray[(oldCandidate + 1) % tree.poly.xArray.length];
                            var y2 = tree.poly.yArray[(oldCandidate + 1) % tree.poly.xArray.length];

                            context.lineWidth = 8;
                            context.strokeStyle = eRGB.toString();

                            context.beginPath();
                            context.moveTo(x1, y1);
                            context.lineTo(x2, y2);
                            context.stroke();

                            var x3 = mouseStat.x - (x1 + x2) / 2;
                            var y3 = mouseStat.y - (y1 + y2) / 2;

                            context.beginPath();
                            context.moveTo(x1 + x3, y1 + y3);
                            context.lineTo(x2 + x3, y2 + y3);
                            context.stroke();
                        }

                        context.restore();
                    }

                    if (!inDraw && mouseStat.x !== null && this.isInside(mouseStat.x, mouseStat.y) && treeNode.children.length == 0) {
                        hlNode = treeNode;

                        if (selectTree) {
                            while (hlNode.parent !== null) {
                                selectEdge = findNearEdge(mouseStat.x, mouseStat.y, hlNode.parent.poly, 100);
                                if (selectEdge !== null) hlNode = hlNode.parent;
                                else break;
                            }
                        }
                    }
                } // end if
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end draw

} // end Polygon class


// PolygonTree class
// Polygons can contain multiple subpolys, when split by one or more (parallel) lines
class PolygonTree {

    // PolygonTree constructor
    // Creates a root node with the passed poly
    // Passed poly is cloned, not just pointed to
    constructor(poly, tot = total, label = [], level = 0) {
            try {
                if (!(poly instanceof Polygon))
                    throw "root polygon of tree is not a polygon";
                else {
                    this.poly = poly.clone(); // the polygon in this node
                    //this.cutIntercepts = []; // the locations of cut lines
                    this.parent = null; // parent of this node
                    this.children = []; // children of this node

                    this.tot = tot;
                    this.label = label;
                    this.level = level;

                    this.cutSlopes = []; // the slopes used to cut
                    this.eHSL = [];

                    this.mi = null;
                } // end if
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end constructor

    build() {
        if (this.level == order.length) {
            maxLeafArea = Math.max(maxLeafArea, this.poly.area());
            minLeafArea = Math.min(minLeafArea, this.poly.area());
            this.poly.genPT();
            leaves.push(this.poly);
            return;
        }
        if (this.tot == 0) return;

        var ind = order[this.level];
        var cur;

        var freq = [];
        for (var i = 0; i < genData[ind].length; ++i) freq.push(0);

        for (var i = 0; i < genData[ind].length; ++i) {
            cur = genData[ind][i];
            for (var j = 0; j < datas.length; ++j) {
                for (var k = 0; k < this.label.length; ++k) {
                    if(!chk[order[k]]) continue;
                    if (datas[j][order[k]] != this.label[k]) break;
                }

                if (k < this.label.length) continue;

                if (datas[j][ind] == cur) ++freq[i];
            }
            freq[i] /= this.tot;
        }

        curLevel = this.level;
        if (freq.length == 0) freq.push(1.0);
        if(!chk[order[this.level]])
            freq = [1.0];
        this.split(freq, tree.cutSlopes[this.level]);

        for (var i = 0; i < this.children.length; ++i) this.children[i].build();

        if (this.children.length == 0) {
            maxLeafArea = Math.max(maxLeafArea, this.poly.area());
            minLeafArea = Math.min(minLeafArea, this.poly.area());
            leaves.push(this.poly);
        }
    }

    // add passed node to this node
    addChild(treeNode) {
            try {
                if (!(treeNode instanceof PolygonTree))
                    throw "in add child, passed node is not a PolygonTree";
                else {
                    treeNode.parent = this;
                    this.children.push(treeNode);
                } // end if passed node is PolygonTree
            } // end try
            catch (e) {
                //console.log(e);
            } // end catch
        } // end addChild

    // PolygonTree split
    // Divides a tree leaf proportionally by area
    // Takes a array of areas that should sum to 1, and the slope to cut with
    split(areas, slope) {
            try {
                if (this.children.length > 0)
                    throw "cannot split polytree node that already has children";
                else if (!(areas instanceof Array))
                    throw "polygon tree split was not passed an array";
                else if (!Polygon.nearlyEqual(areas.reduce(function(sum, value) { return sum + value; }, 0), 1))
                    throw "polygon tree split areas do not sum to one";
                else {
                    if (Polygon.nearlyEqual(slope, 0)) slope = 0;

                    var whichArea = 0; // which area we're working with
                    var remainingArea = 1; // area of remaining poly
                    var remainingPoly = this.poly; // start with this node's poly
                    var orgArea = remainingPoly.area(); // initial area of poly
                    var normedArea; // the current area, normalized by remaining area
                    var splitPolys = []; // the two split polygons just produced

                    while (whichArea + 1 < areas.length) { // split for all but last area
                        if (Polygon.nearlyEqual(areas[whichArea], 0)) {
                            ++whichArea;
                            continue;
                        }
                        if (Polygon.nearlyEqual(areas[whichArea], remainingArea)) {
                            break;
                        }
                        normedArea = areas[whichArea] / remainingArea;
                        splitPolys = remainingPoly.splitByArea(normedArea, slope); // make subpoly matching pres area
                        var newLabel = this.label.slice();
                        newLabel.push(genData[order[this.level]][whichArea]);
                        this.addChild(new PolygonTree(splitPolys[0], Math.round(areas[whichArea] * this.tot), newLabel, this.level + 1)); // make a matching child
                        remainingPoly = splitPolys[1];
                        remainingArea = remainingPoly.area() / orgArea;
                        ++whichArea;
                    } // end while split remains

                    var newLabel = this.label.slice();
                    newLabel.push(genData[order[this.level]][whichArea]);
                    this.addChild(new PolygonTree(remainingPoly, Math.round(areas[whichArea] * this.tot), newLabel, this.level + 1));
                } // end if no exception
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end split

    // Draw this tree by drawing its leaf polys
    draw(context, ox = 0, oy = 0, rx = 1, ry = 1) {
            if (this.children.length == 0)
                this.poly.draw(context, ox, oy, rx, ry, this);
            else {
                this.children.forEach(function(child) {
                    child.draw(context, ox, oy, rx, ry);
                });
                this.poly.draw(context, ox, oy, rx, ry, this);
            }
        } // end draw
} // end PolygonTree class


// Color class
class Color {

    // Color constructor default opaque black
    constructor(r = 0, g = 0, b = 0, a = 255) {
            try {
                if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                    throw "color component not a number";
                else if ((r < 0) || (g < 0) || (b < 0) || (a < 0))
                    throw "color component less than 0";
                else if ((r > 255) || (g > 255) || (b > 255) || (a > 255))
                    throw "color component bigger than 255";
                else {
                    this.r = r;
                    this.g = g;
                    this.b = b;
                    this.a = a;
                }
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end Color constructor

    toString() {
        return 'rgb(' + this.r + ', ' + this.g + ', ' + this.b + ', ' + 1 + ')';
    }

    // Color change method
    change(r, g, b, a) {
            try {
                if ((typeof(r) !== "number") || (typeof(g) !== "number") || (typeof(b) !== "number") || (typeof(a) !== "number"))
                    throw "color component not a number";
                else if ((r < 0) || (g < 0) || (b < 0) || (a < 0))
                    throw "color component less than 0";
                else if ((r > 255) || (g > 255) || (b > 255) || (a > 255))
                    throw "color component bigger than 255";
                else {
                    this.r = r;
                    this.g = g;
                    this.b = b;
                    this.a = a;
                    return (this);
                }
            } // end throw
            catch (e) {
                //console.log(e);
            }
        } // end Color change method

    // Color add method
    add(c) {
            try {
                if (!(c instanceof Color))
                    throw "Color.add: non-color parameter";
                else {
                    this.r += c.r;
                    this.g += c.g;
                    this.b += c.b;
                    this.a += c.a;
                    return (this);
                }
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end color add

    // Color subtract method
    subtract(c) {
            try {
                if (!(c instanceof Color))
                    throw "Color.subtract: non-color parameter";
                else {
                    this.r -= c.r;
                    this.g -= c.g;
                    this.b -= c.b;
                    this.a -= c.a;
                    return (this);
                }
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end color subgtract

    // Color scale method
    scale(s) {
            try {
                if (typeof(s) !== "number")
                    throw "scale factor not a number";
                else {
                    this.r *= s;
                    this.g *= s;
                    this.b *= s;
                    this.a *= s;
                    return (this);
                }
            } // end throw
            catch (e) {
                //console.log(e);
            }
        } // end Color scale method

    // Color copy method
    copy(c) {
            try {
                if (!(c instanceof Color))
                    throw "Color.copy: non-color parameter";
                else {
                    this.r = c.r;
                    this.g = c.g;
                    this.b = c.b;
                    this.a = c.a;
                    return (this);
                }
            } // end try
            catch (e) {
                //console.log(e);
            }
        } // end Color copy method

    // Color clone method
    clone() {
            var newColor = new Color(); // hmm: is this only local?
            newColor.copy(this);
            return (newColor);
        } // end Color clone method

    // Send color to console
    toConsole() {
            //console.log(this.r + " " + this.g + " " + this.b + " " + this.a);
        } // end Color toConsole

} // end color class

function loadData(){
    try{
        var httpReq = new XMLHttpRequest(); // a new http request
        httpReq.open("GET", FILENAME, false); // init the request
        httpReq.send(null); // send the request
        var startTime = Date.now();
        while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
            if ((Date.now() - startTime) > 3000) break;
        } // until its loaded or we time out after three seconds
        if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
            throw "Unable to open " + descr + " file!";
        else
            datas = $.csv.toArrays(httpReq.response);
    }
    catch(e){
        console.log(e);
    }

    categories = datas[0].slice(0);
    for(var i = 0; i < categories.length; ++i) categories[i] = categories[i].replace(/[^A-Za-z-_:.]/g, '_');
    datas = datas.slice(1);
    total = datas.length;
    for(var i = 0; i < categories.length; ++i){
        order.push(i);
        chk.push(true);
        var temp = [];
        for(var j = 0; j < datas.length; ++j){
            temp.push(datas[j][i]);
        }
        genData.push(Array.from(new Set(temp)).sort());
    }
}

function fix() {
    if (order.length % 2 != 0) return;

    categories.push("");

    genData.push([]);

    order.push(order.length);
}

function initTree() {
    // Define a circle polygon with n sides
    var SIDES = order.length; // to be input

    var RADIUS = 200;

    var angle = Math.PI / 2;
    var aIncr = 2 * Math.PI / SIDES;
    var xArray = [],
        yArray = [];
    for (var s = 0; s < SIDES; s++) {
        xArray.push(+(RADIUS * Math.cos(angle)).toFixed(5));
        yArray.push(+(RADIUS * Math.sin(angle)).toFixed(5));
        angle += aIncr;
    } // end for sides
    var poly = new Polygon(xArray, yArray);

    tree = new PolygonTree(poly);

    for (var i = 0; i < poly.xArray.length; ++i) {
        var x1 = poly.xArray[i];
        var y1 = poly.yArray[i];
        var x2 = poly.xArray[(i + 1) % poly.xArray.length];
        var y2 = poly.yArray[(i + 1) % poly.yArray.length];
        if (Polygon.nearlyEqual(x1, x2)) tree.cutSlopes[i] = Infinity;
        else tree.cutSlopes[i] = 1.0 * (y2 - y1) / (x2 - x1);

        var hueSep = 0.7 / (order.length - 1);
        var eH = i * hueSep;
        if (eH > 0.4 + EPSILON) eH += 0.2;
        var eS = 0.5;
        var eL = 0.4;

        tree.eHSL[i] = [eH, eS, eL];
    }

    global_mi = 0;
    leaves = [];
    for (var i = 0; i < order.length; ++i) {
        if (categories[order[i]] == "") continue;
        $('label[for=' + categories[order[i]] + ']').remove();
        $("#" + categories[order[i]]).remove();
        $(formF).append('<input type="checkbox" id = "' + categories[order[i]] + '">');
        $(formF).append('<label for = "' + categories[order[i]] + '">' + categories[order[i]] + '</label>')
        $("#" + categories[order[i]]).prop('checked', chk[order[i]]);
    }
    tree.build();
    distributeMarbles();
}

function initEvents() {
    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mousemove", handleMouseMove);

    mouseDeal = new MyMouseActions();
}

function initForms(){
    $("#buttons").append('<form method="get" action=' + FILENAME +'>' + '\n' +
        '<button id = "download" style="position: absolute; left: 419px; width: 76px; height: 51px; font: 20px Times New Roman;" type="submit">download csv</button>' +
    '</form>');
}

/* main -- here is where execution begins after window load */
function main() {
    canvas = document.getElementById("viewport");
    context = canvas.getContext("2d");

    highlight = document.getElementById("highlight");
    hl_context = highlight.getContext("2d");

    formF = $("#overlay");

    initEvents();

    loadData();

    fix();

    initTree();

    initForms();

    lastT = new Date().getTime();

    setInterval(game_loop, 1000 / fps);
} // end main

function edgeDstSqr(x, y, myPoly, i, j) {
    var proj = vec2.create();

    var a = vec2.fromValues(myPoly.xArray[i], myPoly.yArray[i]);
    var b = vec2.fromValues(myPoly.xArray[j], myPoly.yArray[j]);
    var c = vec2.fromValues(x, y);

    var b_a = vec2.create();
    vec2.subtract(b_a, b, a);

    var r = vec2.dot(b_a, b_a);
    if (Math.abs(r) < EPSILON) proj = vec2.clone(a);
    else {
        r = vec2.dot(vec2.subtract(vec2.create(), c, a), b_a) / r;
        if (r < 0) proj = vec2.clone(a);
        else if (r > 1) proj = vec2.clone(b);
        else vec2.scaleAndAdd(proj, a, b_a, r);
    }

    return vec2.sqrDist(c, proj);
}

function findNearEdge(x, y, myPoly = tree.poly, thr = 1000) {
    var mini = Infinity;
    var ans;

    var i, j;
    for (var i = 0, j = 1; i < myPoly.xArray.length; ++i, j = (j + 1) % myPoly.xArray.length) {
        var sqrD = edgeDstSqr(x, y, myPoly, i, j);
        if (sqrD < mini) mini = sqrD, ans = i;
    }

    if (mini < thr) return ans;
    else return null;
}

function pickRGB(context, str) {
    var i, j;
    for (i = 0; i < order.length; ++i) {
        if (categories[order[i]].length == 0) continue;
        if (str.length < categories[order[i]].length) continue;
        if (str.substring(0, categories[order[i]].length) == categories[order[i]]) break;
    }
    if (i < order.length) {
        var eHSL = tree.eHSL[i].slice();

        var eHSL_RGB = hslToRgb(eHSL[0], eHSL[1], eHSL[2]);
        eRGB = new Color(eHSL_RGB[0], eHSL_RGB[1], eHSL_RGB[2]);

        context.font = "bold 20px Times New Roman";
        context.fillStyle = eRGB.toString();
    } else {
        for (i = 0; i < order.length; ++i) {
            for (j = 0; j < genData[order[i]].length; ++j) {
                if (genData[order[i]][j].length == 0) continue;
                if (str.length < genData[order[i]][j].length) continue;
                if (str.substring(0, genData[order[i]][j].length) == genData[order[i]][j]) break;
            }
            if (j < genData[order[i]].length) {
                var eHSL = tree.eHSL[i].slice();

                eHSL[2] += (0.3 / (genData[order[i]].length - 1)) * j;

                var eHSL_RGB = hslToRgb(eHSL[0], eHSL[1], eHSL[2]);
                eRGB = new Color(eHSL_RGB[0], eHSL_RGB[1], eHSL_RGB[2]);

                context.font = "20px Times New Roman";
                context.fillStyle = eRGB.toString();
            }
        }
    }
}

function textPrint(context, str, maxWidth, ox, oy, rot, isNormal, RGB = "cyan") {
    context.save();
    context.translate(ox, oy);
    context.rotate(rot);

    context.font = "20px Times New Roman";
    context.fillStyle = RGB;
    context.textAlign = "left";

    var totLines = Math.ceil(context.measureText(str).width / maxWidth);
    var newWidth = Math.min(Math.ceil(context.measureText(str).width / totLines) + 20, maxWidth);

    var i = 0;
    var curX = -Math.min(context.measureText(str).width, newWidth) / 2;
    var newX = 0;

    var crossed = false;

    var pr = "";
    while (str.length > 0) {
        if (pr == "") pickRGB(context, str);

        var ch = str.charAt(0);
        if (ch !== ':' && ch !== ',') {
            pr += ch;
            if (newX + context.measureText(pr).width >= newWidth) {
                if (str.length > 1 && str.charAt(1) !== " " && str.charAt(1) !== "," && str.charAt(1) !== ":"
                    && ch !== "-" && str.charAt(1) !== "-") pr += '-';
                crossed = true;
            }
        } else {
            pr += ch;
            pr += ' ';

            if (newX + context.measureText(pr).width >= newWidth) crossed = true;

            if (isNormal) context.fillText(pr, curX, 24 + 20 * i);
            else context.fillText(pr, curX, -20 * totLines + 20 * i);

            curX += context.measureText(pr).width;
            newX += context.measureText(pr).width;

            str = str.slice(1);
            pr = "";
        }
        str = str.slice(1);

        if (crossed) {
            if (isNormal) context.fillText(pr, curX, 24 + 20 * i);
            else context.fillText(pr, curX, -20 * totLines + 20 * i);

            pr = "";
            curX = -Math.min(context.measureText(str).width, newWidth) / 2;
            newX = 0;
            ++i;

            crossed = false;
        }
    }
    if (isNormal) context.fillText(pr, curX, 24 + 20 * i);
    else context.fillText(pr, curX, -20 * totLines + 20 * i);

    context.restore();
}

function hlDraw() {
    if (hlNode == null) return;
    myPoly = hlNode.poly;

    var str = "";
    for (var i = 0; i < hlNode.label.length; ++i) {
        if (categories[order[i]] == "" || !chk[order[i]]) continue;
        str += categories[order[i]] + ": ";
        str += hlNode.label[i];
        if (i !== hlNode.label.length - 1) str += ", ";
    }

    var perc = (myPoly.area() / tree.poly.area() * 100.0);
    perc = perc.toFixed(2) + "% of " + (stack.length == 0 ? "total" : "selected") + " data points";

    var minx = Infinity;
    var miny = Infinity;
    var maxx = -Infinity;
    var maxy = -Infinity;

    var cx = myPoly.cx;
    var cy = myPoly.cy;

    for (var i = 0; i < myPoly.xArray.length; ++i) {
        minx = Math.min(minx, myPoly.xArray[i]);
        miny = Math.min(miny, myPoly.yArray[i]);
        maxx = Math.max(maxx, myPoly.xArray[i]);
        maxy = Math.max(maxy, myPoly.yArray[i]);
    }

    var fac = Infinity;
    fac = Math.min(fac, 320 / (maxx - minx));
    fac = Math.min(fac, 320 / (maxy - miny));

    fac = Math.max(1, fac);

    inDraw = true;
    hl_context.save();

    hl_context.translate(cx * fac, cy * fac);
    hlNode.poly.draw(context, context.canvas.width / 2, context.canvas.height / 2, -1, -1, hlNode);
    hlNode.draw(hl_context, hl_context.canvas.width / 2, hl_context.canvas.height / 2, -fac, -fac);
    hl_context.translate(-cx * fac, -cy * fac);

    hl_context.restore();
    inDraw = false;

    textPrint(hl_context, str, hl_context.canvas.width - 20, hl_context.canvas.width / 2, 0, 0, true);

    var aRGB = "cyan";
    if (myPoly.aRGB !== undefined) aRGB = myPoly.aRGB.toString();
    textPrint(hl_context, perc, hl_context.canvas.width - 20, hl_context.canvas.width / 2, hl_context.canvas.height - 30, 0, true, aRGB);

}

function plDraw() {
    for (var i = 0; i < tree.poly.xArray.length; ++i) {
        if (categories[order[i]] == "" || !chk[order[i]]) continue;

        var j = (i + 1) % tree.poly.xArray.length;

        var x1 = tree.poly.xArray[i];
        var y1 = tree.poly.yArray[i];
        var x2 = tree.poly.xArray[j];
        var y2 = tree.poly.yArray[j];

        var dst = Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
        var tx = -(x1 + x2) / 2 + canvas.width / 2;
        var ty = -(y1 + y2) / 2 + canvas.height / 2;
        var rot = Math.atan2(y2 - y1, x2 - x1) + Math.PI;

        var isNormal = false;
        if (rot > Math.PI / 2 - EPSILON && rot < Math.PI + EPSILON) {
            rot += Math.PI;
            isNormal = true;
        }

        var prStr = categories[order[i]];

        for (var j = 0; j < genData[order[i]].length; ++j) {
            if (j == 0) prStr += ": ";
            else prStr += ", ";
            prStr += genData[order[i]][j];
        }

        textPrint(context, prStr, dst, tx, ty, rot, isNormal);
    }

    if(stack.length > 0){
        var perc = (total / stack[0][2] * 100.0);
        perc = perc.toFixed(2) + "% of " + "total" + " data points";

        var aRGB = "cyan";
        textPrint(context, perc, context.canvas.width - 20, context.canvas.width / 2, context.canvas.height - 30, 0, true, aRGB);
    }
}

function Update() {
    delT = new Date().getTime() - lastT;
    lastT += delT;
    delT = 0.01;

    if (mouseStat.leftClick) mouseDeal.onLeftClick();
    if (mouseStat.rightClick) mouseDeal.onRightClick();
    if (mouseStat.leftDown) mouseDeal.onLeftDown();
    if (mouseStat.leftUp) mouseDeal.onLeftUp();
    if (mouseStat.rightDown) mouseDeal.onRightDown();
    if (mouseStat.rightUp) mouseDeal.onRightUp();
    if (mouseStat.drag) mouseDeal.onDrag();
    if (mouseStat.move) mouseDeal.onMove();

    for (var i = 0; i < order.length; ++i) {
        if (categories[order[i]] == "") continue;
        if ($("#" + categories[order[i]]).prop('checked') !== chk[order[i]]) {
            chk[order[i]] = $("#" + categories[order[i]]).prop('checked');
            updateRequired = true;
        }
    }

    if(clicked){
        if(hlNode !== null){
            var newGenData = [];
            for(var i = 0; i < genData.length; ++i){
                newGenData.push(genData[i].slice(0));
            }
            stack.push([newGenData, datas.slice(0), total]);
            
            for(var j = 0; j < hlNode.label.length; ++j){
                for(var k = 0; k < genData[order[j]].length; ++k){
                    if(genData[order[j]][k] == hlNode.label[j]) break;
                }
                if(k < genData[order[j]].length){
                    genData[order[j]] = [genData[order[j]][k]];
                }
            }

            for(var i = 0; i < datas.length; ++i){
                for(var j = 0; j < hlNode.label.length; ++j){
                    if(hlNode.label[j] !== datas[i][order[j]]) break;
                }
                if(j < hlNode.label.length){
                    datas = datas.slice(0, i).concat(datas.slice(i + 1));
                    --i;
                }
            }

            total = datas.length;

            updateRequired = true;

            if(stack.length == 1){
                $("#backbutton").append('<button id = "back" onclick="back()" style="font: 20px Times New Roman;">go back in hierarchy</button>');
            }
        }
        clicked = false;
    }

    if (updateRequired) {
        noMarble = true;
        Draw();
        noMarble = false;

        img1 = new Image();
        img1.src = canvas.toDataURL();

        img2 = new Image();
        img2.src = highlight.toDataURL();

        initTree();

        noMarble = true;
        Draw();
        noMarble = false;

        img11 = new Image();
        img11.src = canvas.toDataURL();

        img22 = new Image();
        img22.src = highlight.toDataURL();

        updateRequired = false;

        busy = true;
        alp = 1.0;

        setTimeout(function() { busy = false; }, 3000);
    }

    updateMarbles();
}

function drawMouse() {
    if (noMarble) return;
    context.save();
    context.translate(canvas.width / 2, canvas.height / 2);
    context.scale(-1, -1);
    context.fillStyle = 'white';
    context.beginPath();
    context.arc(mouseStat.x, mouseStat.y, 5, 0, 2 * Math.PI);
    context.fill();
    context.restore();
}

function Draw() {
    canvas.width = canvas.width;
    highlight.width = highlight.width;

    if (busy) {
        context.globalCompositeOperation = 'multiply';
        hl_context.globalCompositeOperation = 'multiply';

        alp *= .98;

        context.globalAlpha = alp;
        hl_context.globalAlpha = alp;

        context.drawImage(img1, 0, 0);
        hl_context.drawImage(img2, 0, 0);

        context.globalAlpha = 1 - alp;
        hl_context.globalAlpha = 1 - alp;

        context.drawImage(img11, 0, 0);
        hl_context.drawImage(img22, 0, 0);

        context.globalCompositeOperation = "source-over";
        hl_context.globalCompositeOperation = "source-over";
    } else {
        context.globalAlpha = 1.0;
        hl_context.globalAlpha = 1.0;

        hlNode = null;

        tree.draw(context, canvas.width / 2, canvas.height / 2, -1, -1);

        hlDraw();

        plDraw();
    }

    drawMouse();
    drawMarbles();
}

function game_loop() {
    Update();
    Draw();
}
