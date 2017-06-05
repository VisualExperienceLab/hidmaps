/* classes */ 


// PolygonTree class
// Polygons can contain multiple subpolys, when split by one or more (parallel) lines
class PolygonTree
    
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
    } // end constructor

        // Polygon
} // end PolygonTree class


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
    
        // true if passed polygon is same as this one
    equals(poly) {
        try {  
            if (!(poly instanceOf Polygon))
                throw "cannot compare polygon to non-polygon";
            else if (this === poly) 
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
                context.translate(ox,oy);
                context.scale(rx,ry); 
                
                // draw polygon
                context.beginPath();
                context.moveTo(this.xArray[0],this.yArray[0]);
                for (var p=1; p<this.xArray.length; p++) {
                    context.lineTo(this.xArray[p],this.yArray[p]);
                } // end for points
                context.fill();
            } // end if
        } // end try
        
        catch (e) {
            console.log(e);
        } 
    } // end draw
    
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
    
} // end Polygon class


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
 
    // Define a polygon
    var xArray = [10,210,310];
    var yArray = [10,110,10]; 
    var poly = new Polygon(xArray,yArray); 
    
    // draw the polygon
    poly.draw(context,0,h,1,-1);
    console.log(poly.area());
}
