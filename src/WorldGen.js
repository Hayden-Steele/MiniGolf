let worldBounds = new Bounds(0, 0, window.screen.availWidth, window.screen.availHeight + 96) // Screen Space 

let holePar = 0;

/** @type {Bounds[]} */
let heightBounds = []

function setUpWorld() {
    heightBounds = []

    // Add wall points to posSystem
    let wallSystem = new PositionStorage(worldBounds)
    worldBounds.loopThroughScale((x, y) => {

        if (biome[x][y] > 0.4) { // Borders
            wallSystem.addPoint(x, y)
        }
        
    }, 32)
    // Loop through system and assign wall types
    wallSystem.positions.forEach((pos) => {
        let name = borderName(pos.x, pos.y, 32, wallSystem)
        setBoundsHeight(name, 8, pos.x, pos.y, 2)

        scene.push(
            new GameObject("Borders/LongGrass/" + name + ".png",
                pos.x,
                pos.y,
                0,
                2.05,
                false,
                "",
                1
            )
        )
    })

    scene.push(
        new GameObject("Objects/Arrow.png", 50, 50, 0, 5, false, "arrow", -100000)
    )
    let arrow = getObjByID("arrow")
    arrow.alwaysRender = true;
}


function spawnBallAndGoal() {

    console.log("Generating Flag Pos")
    let flagPos = findRandomGrassLocation(100, 80)
    console.log("Done Generating Flag Pos")

    scene.push(new GameObject("Objects/Flag.png", flagPos.x, flagPos.y + 1, 0, 2, false, "flag"))
    scene.push(new GameObject("Objects/Hole.png", flagPos.x, flagPos.y, 0, 2, false, "hole"))
    getObjByID("hole").zIndex = -100


    console.log("Generating Ball Pos")
    let ballLoc = findFarthestGrassLocation(flagPos, 100, 20)
    let ballScale = 1.5
    scene.push(new GameObject("Objects/Ball.png", ballLoc.loc.x, ballLoc.loc.y, 0, ballScale, true, "ball"))
    scene.push(new GameObject("Objects/Ball_Shadow.png", ballLoc.loc.x, ballLoc.loc.y, 0, ballScale, false, "ball_shadow"))
    getObjByID("ball").drag = 0.95
    getObjByID("ball").height = 200
    getObjByID("ball_shadow").zIndex = -1

    console.log("Spawned Objects", flagPos, ballLoc.loc)

    holePar = Math.round(ballLoc.dist / 400)
    console.log(ballLoc.dist)

    console.log("Par: ", holePar)
}
function dstBetweenPoints(pos1, pos2) {
    let a = pos2.x - pos1.x
    let b = pos2.y - pos1.y
    return Math.sqrt(a * a + b * b)
}
function returnMax(a, x, y) {

    let b = -Infinity

    try {
        b = heightMap[x][y]
    } catch (err) { }

    return a > b ? a : b
}
function maxHeightInSurroundings(point, radius) {
    let maxVal = -Infinity;
    // for (let x = point.x - radius; x < point.x + radius; x++) {
    //     for (let y = point.y - radius; y < point.y + radius; y++) {
    //         try {
    //             if (heightMap[x][y] > maxVal) {
    //                 maxVal = heightMap[x][y]
    //             }
    //         } catch (err) {}
    //     }
    // }

    maxVal = returnMax(maxVal, point.x, point.y)
    maxVal = returnMax(maxVal, point.x + radius, point.y)
    maxVal = returnMax(maxVal, point.x - radius, point.y)
    maxVal = returnMax(maxVal, point.x, point.y + radius)
    maxVal = returnMax(maxVal, point.x, point.y - radius)

    return maxVal

}
function minHeightInSurroundings(point, radius) {
    let minVal = Infinity;
    for (let x = point.x - radius; x < point.x + radius; x++) {
        for (let y = point.y - radius; y < point.y + radius; y++) {
            if (heightMap[x][y] < minVal) {
                minVal = heightMap[x][y]
            }
        }
    }
    return minVal
}
// Function to find a random location on grass with a minimum distance from the world borders
function findRandomGrassLocation(minDistanceFromBorder, minDistFromEdge) {
    let x, y;
    let startTime = new Date()

    do {
        x = Math.floor(Math.random() * (heightMap.length - (2 * minDistanceFromBorder)) + minDistanceFromBorder);
        y = Math.floor(Math.random() * (heightMap[0].length - (2 * minDistanceFromBorder)) + minDistanceFromBorder);

        if (new Date().getTime() - startTime.getTime() > 2000) {
            // minDistanceFromBorder = 20
            console.log("Too Long... Brute Forcing")
            // console.log(x, y)
            // overCount+

            let arr = []
            for (let x = 1; x < heightMap.length; x += 2) {
                for (let y = 1; y < heightMap[0].length; y += 2) {
                    if (maxHeightInSurroundings({ x: x, y: y }, minDistFromEdge) == 0) {
                        arr.push({ x: x, y: y })
                    }
                }
            }

            console.log(arr)
            console.log(arr[Math.floor(Math.random() * arr.length)])

            return arr[Math.floor(Math.random() * arr.length)]

        }
    } while (
        !(maxHeightInSurroundings({ x: x, y: y }, minDistFromEdge) == 0)
    ); // Keep searching until a grass location is found


    return { x: x, y: y };
}

function findFarthestGrassLocation(startPoint, minDistanceFromBorder, minDistFromEdge) {
    console.log("Finding Ball Location")

    let maxDistance = -1;
    let farthestLocation = { x: 500, y: 500 };

    for (let x = minDistanceFromBorder; x < worldBounds.width - minDistanceFromBorder; x++) {
        for (let y = minDistanceFromBorder; y < worldBounds.height - minDistanceFromBorder; y++) {
            if (heightMap[x][y] != 0) { continue; }

            const distance = dstBetweenPoints({ x: x, y: y }, startPoint)

            if (distance > maxDistance && maxHeightInSurroundings({ x: x, y: y }, minDistFromEdge) == 0 && minHeightInSurroundings({ x: x, y: y }, minDistFromEdge) == 0) {
                maxDistance = distance;
                farthestLocation = { x: x, y: y };
            }
        }
    }

    return { loc: farthestLocation, dist: maxDistance };
}





function genHeightMaps() {

    // Calculate heightmap
    heightBounds.forEach((bound) => {
        bound.loopThrough((x, y) => {
            if (bound.inBounds(x, y)) {
                try {
                    heightMap[x][y] = bound.value // Height of the platforms
                } catch (err) { }
            }
        })
    })

    console.log("Done Generating Height Maps")
}


function borderName(x, y, imgScale, posSystem) {

    let b = true
    let t = true
    let l = true
    let r = true

    let bl = false
    let br = false
    let tl = false
    let tr = false

    b = posSystem.hasPoint(x, y + imgScale)
    t = posSystem.hasPoint(x, y - imgScale)
    l = posSystem.hasPoint(x - imgScale, y)
    r = posSystem.hasPoint(x + imgScale, y)

    bl = posSystem.hasPoint(x - imgScale, y + imgScale)
    br = posSystem.hasPoint(x + imgScale, y + imgScale)
    tl = posSystem.hasPoint(x - imgScale, y - imgScale)
    tr = posSystem.hasPoint(x + imgScale, y - imgScale)

    if (!bl && br && tl && tr && t && b && l && r) { return "MBL" }
    if (bl && !br && tl && tr && t && b && l && r) { return "MBR" }
    if (bl && br && !tl && tr && t && b && l && r) { return "MTL" }
    if (bl && br && tl && !tr && t && b && l && r) { return "MTR" }


    // if (!bl && br && !tl && tr && t && b && l && r) { return "TL" }
    // if (bl && br && tl && tr && t && b && l && r) { return "TM" }
    // if (bl && br && tl && tr && t && b && l && r) { return "TR" }

    // if (bl && br && tl && tr && t && b && l && r) { return "ML" }
    // if (bl && br && tl && tr && t && b && l && r) { return "MM" }
    // if (bl && br && tl && tr && t && b && l && r) { return "MR" }

    // if (bl && br && tl && tr && t && b && l && r) { return "BL" }
    // if (bl && br && tl && tr && t && b && l && r) { return "BM" }
    // if (bl && br && tl && tr && t && b && l && r) { return "BR" }



    let firstLetter = "M";
    let secondLetter = "M";

    if (t && b) { firstLetter = "M" }
    if (t && !b) { firstLetter = "B" }
    if (!t && b) { firstLetter = "T" }

    if (l && r) { secondLetter = "M" }
    if (l && !r) { secondLetter = "R" }
    if (!l && r) { secondLetter = "L" }

    return firstLetter + secondLetter
}

function setBoundsHeight(name, height, xPos, yPos, renderScale) {

    /** @type {Bounds} */
    let bounds = new Bounds(0, 0, 0, 0, 0);
    let secondBounds = new Bounds(0, 0, 0, 0, 0)

    switch (name) {

        case "BL":
            bounds = new Bounds(xPos + 1 * renderScale, yPos - 16 * renderScale, 8 * renderScale, 11 * renderScale, height)
            break;
        case "BM":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 16 * renderScale, 11 * renderScale, height)
            break;
        case "BR":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 11 * renderScale, height)
            break;



        case "ML":
            bounds = new Bounds(xPos + 1 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 16 * renderScale, height)
            break;
        case "MM":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 16 * renderScale, 16 * renderScale, height)
            break;
        case "MR":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 16 * renderScale, height)
            break;



        case "TL":
            bounds = new Bounds(xPos + 1 * renderScale, yPos - 7 * renderScale, 7 * renderScale, 7 * renderScale, height)
            break;
        case "TM":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 7 * renderScale, 16 * renderScale, 7 * renderScale, height)
            break;
        case "TR":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 7 * renderScale, 7 * renderScale, 8 * renderScale, height)
            break;



        case "MBR":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 16 * renderScale, height)
            secondBounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 16 * renderScale, 11 * renderScale, height)
            break;
        case "MBL":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 16 * renderScale, 11 * renderScale, height)
            secondBounds = new Bounds(xPos + 1 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 16 * renderScale, height)
            break;
        case "MTR":
            bounds = new Bounds(xPos - 8 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 16 * renderScale, height)
            secondBounds = new Bounds(xPos - 8 * renderScale, yPos - 7 * renderScale, 16 * renderScale, 7 * renderScale, height)
            break;
        case "MTL":
            bounds = new Bounds(xPos + 1 * renderScale, yPos - 16 * renderScale, 7 * renderScale, 16 * renderScale, height)
            secondBounds = new Bounds(xPos - 8 * renderScale, yPos - 7 * renderScale, 16 * renderScale, 7 * renderScale, height)
            break;
    }

    heightBounds.push(bounds)
    heightBounds.push(secondBounds)
}
