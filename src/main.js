let windowManager = new WindowManager()
let isMaster = windowManager.init() == 0;
windowManager.addCallbacks(mouseMove, mouseDown, mouseUp)

/** @type {GameObject[]} */
let scene = [];

let biome = [];
let seed = Math.random() * 100;

let holeCount = 0;
let totalHitsCount = 0;
let wasReset = false;

// Setup popup windows
/** @type {Window[]} */
let windowStorage = []
let windowNames = [
    "BallWindow", // 0
    "GoalWindow", // 1
]
function spawnWindows() {
    for (let i = 0; i < windowNames.length; i++) {
        try {
            let spawnedWindow = window.open(window.location.href, windowNames[i], "resizable");
            spawnedWindow.resizeTo(10, 10);
            spawnedWindow.moveTo(0, 0)
            windowStorage.push(spawnedWindow)
        } catch(err) {
            console.log(err)
        }
    }
}

if (isMaster) {
    spawnWindows();
}

if (window.opener) {
    windowManager.yShift = yShift
}

function windowMoveCenter(index, x, y) {

    try {
        windowStorage[index].moveTo(
            x - (windowStorage[index].innerWidth / 2),
            y - (windowStorage[index].innerHeight / 2) - yShift
        )
    } catch(err) {}
}
function windowMoveCorner(index, x, y) {
    try {
        windowStorage[index].moveTo(x, y)
    } catch (err) {}
}
function windowMoveSides(index, x, y, baseSizeX, baseSizeY, xPush, yPush) {

    let posX = x
    let posY = y //- (baseSizeY/2)// - (windowStorage[index].innerHeight)
    
    let sizeX = baseSizeX
    let sizeY = baseSizeY

    if (xPush > 0) {
        sizeX += xPush
        posX += xPush / 2
    } else {
        sizeX -= xPush
        posX += xPush / 2
    }

    if (yPush > 0) {
        sizeY += yPush
        posY += yPush / 2
    } else {
        sizeY -= yPush
        posY += yPush / 2
    }

    try {
        windowStorage[index].resizeTo(sizeX, sizeY)
    } catch(err) {}
    windowMoveCenter(index, posX, posY)
}
function windowMoveRotate(index, x, y, rot, dist) {

    let xPos = x;
    let yPos = y;

    xPos += Math.cos(rot) * dist
    yPos += Math.sin(rot) * dist

    // windowStorage[index].moveTo(xPos, yPos)
    windowMoveCenter(index, xPos, yPos)
} 



// Scene update code
setInterval(() => {
    try {
        if (isMaster) {
            scene.sort((a, b) => b.zIndex - a.zIndex); // Sort the scene by zIndex
            if (titleScreen) {
                windowManager.setSendData(JSON.stringify({
                    scene: [],
                    bounds: worldBounds,
                    par: 0,
                    hits: 0,
                    titleScreen: true
                }))
            } else {
                windowManager.setSendData(JSON.stringify({
                    scene: scene,
                    bounds: worldBounds,
                    par: holePar,
                    hits: ballHitCount,
                    titleScreen: false
                }))
            }
            
        } else {
            let data = JSON.parse(windowManager.getRecievedData())
            scene = data.scene
            worldBounds = data.bounds
            holePar = data.par
            ballHitCount = data.hits
            titleScreen = data.titleScreen
        }

        document.title = `Par: ${holePar} - Hits: ${ballHitCount}`

    } catch(err) { console.warn(err) }
}, 20);


// Render code
window.requestAnimationFrame(render)


if (isMaster) {
    masterLogic()
}

async function masterLogic() {
    await titleMenu()

    start()
    startAmbiance()

    setInterval(() => {
        updateWorld()
    }, 20);
}

// Starts the scene
async function start() {
    
    loading = true;
    wobbleGoal = false;

    await wait(100)

    holeCount++
    totalHitsCount += ballHitCount

    scene = []
    // for (let i = scene.length-1; i >= 0; i--) {

    //     let random = Math.floor(Math.random() * scene.length)

    //     scene.splice(random, 1)
        
    //     if (i % 10 == 0) {
    //         await wait(1)
    //     }
    // }

    // await wait(10)

    seed = Math.random() * 100;
    ballHitCount = 0;
    
    genBiome()
    fillHeightMap();
    setUpWorld()

    // Generate Height maps and then choose ball and goal locations
    genHeightMaps();
    spawnBallAndGoal();

    lastHitTime = new Date()
    loading = false;
    wasReset = true;

}

async function wait(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve()
        }, ms);
    })
}

async function titleMenu() {
    return new Promise((resolve) => {
        loading = false;
        titleScreen = true;

        scene.push(new GameObject("Logo/Logo.png", 500, 500, 0, 0.5, false, "logo", -101))
        let logo = getObjByID("logo")
        logo.alwaysRender = true

        scene.push(new GameObject("Logo/LogoBack.png", 500, 500, 0, 1.75, false, "logoBack", -100))
        let logoBack = getObjByID("logoBack")
        logoBack.alwaysRender = true

        scene.push(new GameObject("Logo/ClickToPlay.png", 500, 500, 0, 0.2, false, "clickToPlay", -102))
        let clickToPlay = getObjByID("clickToPlay")
        clickToPlay.alwaysRender = true;

        let id = setInterval(() => {
            let centerX = xOff + window.innerWidth / 2
            let centerY = ( yOff + window.innerHeight / 2 )

            logo.xPos = centerX
            logo.yPos = centerY + 10

            logoBack.xPos = centerX
            logoBack.yPos = centerY + 200

            clickToPlay.xPos = centerX
            clickToPlay.yPos = centerY + 150
            clickToPlay.scale = 0.3 + (Math.cos(new Date().getTime() / 1000) * 0.05)

            if (windowStorage.length == 0) {
                spawnWindows();
            }

            windowMoveSides(
                0,
                xOff - 70 + Math.cos(new Date().getTime()/1000) * 75, 
                yOff - 70 + Math.sin(new Date().getTime()/1000) * 75,
                100,
                100,
                Math.cos(new Date().getTime()/500) * 100, 
                Math.sin(new Date().getTime()/500) * 100
            )

            windowMoveSides(
                1,
                xOff + window.innerWidth + 70 + Math.sin(new Date().getTime()/1000) * 75, 
                yOff + window.innerHeight + 70 + Math.cos(new Date().getTime()/1000) * 75,
                100,
                100,
                Math.cos(new Date().getTime()/500 + Math.PI) * 100, 
                Math.sin(new Date().getTime()/500 + Math.PI) * 100
            )

        }, 50);

        addEventListener("click", (event) => {
            clearInterval(id)
            titleScreen = false;
            resolve()
        })
    })
}


// Biome Transpher
if (false) {
    if (!isMaster) {
        fillBiome()
        setInterval(() => {
            let newBiome = JSON.parse(localStorage.getItem("biome"))
            biome[newBiome.x] = newBiome.val
        }, 2);
    }
    
    let biomeSendX = 0;
    let biomeSendY = 0;
    if (isMaster) { // Send Biome data
        setInterval(() => {
            if (biomeSendX >= worldBounds.width) {
                biomeSendX = 0;
            }
            localStorage.setItem("biome", JSON.stringify({
                x: biomeSendX,
                val: biome[biomeSendX]
            }))
    
            biomeSendX += 1;
        }, 5);
    }
    
}


function noiseFunction(x, y, z) {
    return PerlinNoise.noise(x, y, z)
}

function genBiome() {
    biome = []

    let borderWidth = 80;
    let bottomAdd = 90

    for (let x = 0; x < worldBounds.width; x++) {
        let tmp = []
        for (let y = 0; y < worldBounds.height; y++) {

            let inBounds = false;
            if (x < borderWidth || x > worldBounds.width - borderWidth) { inBounds = true; }
            if (y < borderWidth || y > worldBounds.height - borderWidth - bottomAdd) { inBounds = true; }
            
            if (inBounds) {
                tmp.push(2) // Force the borders to be walls
            } else {
                tmp.push(
                    // Math.floor(PerlinNoise.noise(x / 700, y / 700, seed) * 10) / 10
                    PerlinNoise.noise(x / 500, y / 500, seed)
                    // PerlinNoise.noise(x / 250, y / 250, seed)
                )
            }

        }
        biome.push(tmp)
    }
}
