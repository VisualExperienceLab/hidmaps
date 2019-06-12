var mouseCandidate = null;
var curCandidate = null;
var oldCandidate = null;

var lastX, lastY;

var mouseStat = {
    x: null,
    y: null,
    leftClick: false,
    rightClick: false,
    leftDown: false,
    leftUp: false,
    rightDown: false,
    rightUp: false,
    drag: false,
    move: false
};

function handleClick(e) {
    if (e.which == 1) mouseStat.leftClick = true;
    else mouseStat.rightClick = true;
}

function handleMouseDown(e) {
    if (e.which == 1) mouseStat.leftDown = true;
    else mouseStat.rightDown = true;
    mouseStat.drag = true;
}

function handleMouseUp(e) {
    if (e.which == 1) mouseStat.leftUp = true;
    else mouseStat.rightUp = true;
    mouseStat.drag = false;
}

function handleMouseMove(e) {
    mouseStat.x = canvas.width / 2 - e.clientX;
    mouseStat.y = canvas.height / 2 - e.clientY;
    mouseStat.move = true;
}

class MouseActions {
    constructor() {}

    onLeftClick() {
        mouseStat.leftClick = false;
    }

    onRightClick() {
        mouseStat.rightClick = false;
    }

    onLeftDown() {
        mouseStat.leftDown = false;
    }

    onLeftUp() {
        mouseStat.leftUp = false;
    }

    onRightDown() {
        mouseStat.rightDown = false;
    }

    onRightUp() {
        mouseStat.rightUp = false;
    }

    onDrag() {

    }

    onMove() {
        mouseStat.move = false;
    }
}

class MyMouseActions extends MouseActions {
    onLeftClick() {
        if(Math.abs(mouseStat.x - lastX) < EPSILON && Math.abs(mouseStat.y - lastY) < EPSILON) clicked = true;
        mouseStat.leftClick = false;
    }

    onLeftDown() {
        mouseCandidate = findNearEdge(mouseStat.x, mouseStat.y);
        if (categories[order[mouseCandidate]] == "" || !chk[order[mouseCandidate]]) mouseCandidate = null;
        oldCandidate = mouseCandidate;
        mouseStat.leftDown = false;

        lastX = mouseStat.x;
        lastY = mouseStat.y;
    }

    onLeftUp() {
        if (mouseCandidate !== null) {
            var newCandidate = findNearEdge(mouseStat.x, mouseStat.y);
            if (categories[order[newCandidate]] == "" || !chk[order[newCandidate]]) newCandidate = null;
            if (newCandidate !== null && newCandidate !== mouseCandidate) {
                var dir = Math.sign(newCandidate - mouseCandidate);
                for (var i = mouseCandidate; i !== newCandidate; i += dir) {
                    var j = i + dir;
                    var t = order[i];
                    order[i] = order[j];
                    order[j] = t;
                }
                updateRequired = true;
            }
        }

        //selectTree = false;

        oldCandidate = null;
        mouseStat.leftUp = false;
    }

    onMove() {
        curCandidate = findNearEdge(mouseStat.x, mouseStat.y);
        if (categories[order[curCandidate]] == "" || !chk[order[curCandidate]]) curCandidate = null;
        mouseStat.move = false;
    }
}