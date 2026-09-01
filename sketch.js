let globalTheta = 0; // Earth rotation angle
const GLOBE_RADIUS = 300; 

let humanoid = []; 
let messages = []; 

// Arrays to store grid lines (Latitudes & Longitudes)
const LATS = [];
const LONS = [];

// Text corpus describing anxiety and disconnection
const corpus = [
    "I feel completely disconnected.",
    "나는 너무 외롭다",
    "Personne ne m'écoute.",
    "¿Hacia dónde voy?",
    "Everything is moving too fast.",
    "我找不到方向",
    "Too much noise.",
    "Не могу уснуть.",
    "不安が消えない",
    "The pressure is crushing",
    "No puedo más con esto."
];

function setup() {
    createCanvas(windowWidth, windowHeight);
    
    // Initialize horizontal latitude rings
    for (let lat = -PI / 2 + 0.3; lat < PI / 2; lat += 0.3) {
        LATS.push(lat);
    }
    // Initialize vertical longitude rings
    for (let lon = 0; lon < TWO_PI; lon += PI / 6) {
        LONS.push(lon);
    }

    generateHumanoid();
}

function draw() {
    background(5, 5, 8); 

    globalTheta += 0.003; // Constant rotation speed

    // Spawn messages randomly over time
    if (frameCount % 45 === 0 && messages.length < 20) {
        messages.push(new NomadicMessage());
    }

    let renderQueue = [];

    // 1. Queue all wireframe grid lines
    queueGridLines(renderQueue);

    // 2. Queue humanoid particles
    for (let pt of humanoid) {
        let p = project3D(pt.x, pt.y, pt.z);
        renderQueue.push({ type: 'human', proj: p, obj: pt, z: p.z });
    }

    // 3. Queue text messages
    for (let i = messages.length - 1; i >= 0; i--) {
        let msg = messages[i];
        msg.update();
        if (msg.isDead()) {
            messages.splice(i, 1);
        } else {
            // Calculate local 3D coordinate on the rotating sphere
            let lx = msg.r * cos(msg.lat) * cos(msg.lon);
            let ly = msg.r * sin(msg.lat);
            let lz = msg.r * cos(msg.lat) * sin(msg.lon);
            let p = project3D(lx, ly, lz);
            
            // Calculate 2D tangent angle to align text to the curved line
            let angle = msg.getRotationAngle();
            
            renderQueue.push({ type: 'message', proj: p, angle: angle, obj: msg, z: p.z });
        }
    }

    // Sort all elements by Z axis for true depth perception (Painter's Algorithm)
    renderQueue.sort((a, b) => b.z - a.z);

    // Render everything in depth order (back to front)
    for (let item of renderQueue) {
        if (item.type === 'line') {
            // Lines fade out as they go to the back of the globe
            let alpha = map(item.z, -GLOBE_RADIUS, GLOBE_RADIUS, 180, 10);
            stroke(40, 150, 220, alpha); // Cyan radio wave color
            strokeWeight(1);
            line(item.p1.x, item.p1.y, item.p2.x, item.p2.y);
        } 
        else if (item.type === 'human') {
            item.obj.display(item.proj);
        } 
        else if (item.type === 'message') {
            item.obj.display(item.proj, item.angle);
        }
    }
}

// ----------------------------------------------------
// 3D to 2D Projection Engine
// ----------------------------------------------------
function project3D(x, y, z) {
    // 1. Rotation around Y-axis (Earth rotation)
    let x1 = x * cos(globalTheta) - z * sin(globalTheta);
    let z1 = x * sin(globalTheta) + z * cos(globalTheta);
    let y1 = y;

    // 2. Tilt around X-axis (Globe perspective tilt)
    let tilt = 0.35; 
    let y2 = y1 * cos(tilt) - z1 * sin(tilt);
    let z2 = y1 * sin(tilt) + z1 * cos(tilt);
    let x2 = x1;

    // 3. Perspective projection
    let fov = 700; 
    let scaleFactor = fov / (fov + z2); 
    let px = width / 2 + x2 * scaleFactor;
    let py = height / 2 + y2 * scaleFactor;

    return { x: px, y: py, z: z2, scale: scaleFactor };
}

// ----------------------------------------------------
// Build Grid Lines Geometry
// ----------------------------------------------------
function queueGridLines(queue) {
    // Latitudes (Horizontal lines)
    for (let lat of LATS) {
        let r = GLOBE_RADIUS * cos(lat);
        let y = GLOBE_RADIUS * sin(lat);
        for (let lon = 0; lon < TWO_PI; lon += 0.1) {
            let x1 = r * cos(lon), z1 = r * sin(lon);
            let x2 = r * cos(lon + 0.1), z2 = r * sin(lon + 0.1);
            let p1 = project3D(x1, y, z1);
            let p2 = project3D(x2, y, z2);
            // Use midpoint Z for depth sorting
            queue.push({ type: 'line', p1: p1, p2: p2, z: (p1.z + p2.z) / 2 });
        }
    }

    // Longitudes (Vertical lines)
    for (let lon of LONS) {
        for (let lat = -PI/2; lat < PI/2; lat += 0.1) {
            let r1 = GLOBE_RADIUS * cos(lat);
            let y1 = GLOBE_RADIUS * sin(lat);
            let x1 = r1 * cos(lon), z1 = r1 * sin(lon);

            let lat2 = lat + 0.1;
            let r2 = GLOBE_RADIUS * cos(lat2);
            let y2 = GLOBE_RADIUS * sin(lat2);
            let x2 = r2 * cos(lon), z2 = r2 * sin(lon);
            
            let p1 = project3D(x1, y1, z1);
            let p2 = project3D(x2, y2, z2);
            queue.push({ type: 'line', p1: p1, p2: p2, z: (p1.z + p2.z) / 2 });
        }
    }
}

// ----------------------------------------------------
// Humanoid Class (Digital Data Body)
// ----------------------------------------------------
class HumanoidParticle {
    constructor(x, y, z) {
        this.x = x; this.y = y; this.z = z;
        this.char = String.fromCharCode(97 + floor(random(26))); // Random a-z
    }

    display(proj) {
        let alpha = map(proj.z, -150, 150, 255, 30);
        fill(255, alpha);
        noStroke();
        textSize(14 * proj.scale);
        textAlign(CENTER, CENTER);
        text(this.char, proj.x, proj.y);
    }
}

// Generate the a-z humanoid shape
function generateHumanoid() {
    // Head
    for (let i = 0; i < 50; i++) humanoid.push(new HumanoidParticle(random(-20, 20), random(-130, -90), random(-20, 20)));
    // Torso
    for (let i = 0; i < 100; i++) humanoid.push(new HumanoidParticle(random(-30, 30), random(-90, 30), random(-15, 15)));
    // Left Arm
    for (let i = 0; i < 40; i++) humanoid.push(new HumanoidParticle(random(-80, -30), random(-90, -10), random(-10, 10)));
    // Right Arm
    for (let i = 0; i < 40; i++) humanoid.push(new HumanoidParticle(random(30, 80), random(-90, -10), random(-10, 10)));
    // Left Leg
    for (let i = 0; i < 40; i++) humanoid.push(new HumanoidParticle(random(-30, -5), random(30, 130), random(-15, 15)));
    // Right Leg
    for (let i = 0; i < 40; i++) humanoid.push(new HumanoidParticle(random(5, 30), random(30, 130), random(-15, 15)));
}

// ----------------------------------------------------
// Nomadic Message Class
// ----------------------------------------------------
class NomadicMessage {
    constructor() {
        this.text = random(corpus);
        this.isVertical = random([true, false]); // Attach to horizontal OR vertical line

        if (this.isVertical) {
            this.lat = random(-PI / 2.5, PI / 2.5); // Random position on the line
            this.lon = random(LONS);                // Snapped to a longitude grid line
        } else {
            this.lat = random(LATS);                // Snapped to a latitude grid line
            this.lon = random(TWO_PI);              // Random position on the line
        }

        this.r = GLOBE_RADIUS + random(10, 25); // Float slightly above wires
        this.life = 0;
        this.maxLife = random(200, 400); // Ephemeral duration
    }

    update() {
        this.life++;
    }

    isDead() {
        return this.life >= this.maxLife;
    }

    // Calculates tangent angle to align text to the 3D curved wireframe
    getRotationAngle() {
        let p1 = project3D(
            this.r * cos(this.lat) * cos(this.lon),
            this.r * sin(this.lat),
            this.r * cos(this.lat) * sin(this.lon)
        );

        let p2;
        if (this.isVertical) {
            // Find tangent along the longitude curve
            let lat2 = this.lat + 0.05;
            p2 = project3D(
                this.r * cos(lat2) * cos(this.lon),
                this.r * sin(lat2),
                this.r * cos(lat2) * sin(this.lon)
            );
        } else {
            // Find tangent along the latitude curve
            let lon2 = this.lon + 0.05;
            p2 = project3D(
                this.r * cos(this.lat) * cos(lon2),
                this.r * sin(this.lat),
                this.r * cos(this.lat) * sin(lon2)
            );
        }
        return atan2(p2.y - p1.y, p2.x - p1.x); // Perfect curve alignment
    }

    display(proj, angle) {
        let fadeIn = min(255, this.life * 4);
        let fadeOut = min(255, (this.maxLife - this.life) * 4);
        let currentAlpha = min(fadeIn, fadeOut);

        // Fade out text significantly if it rotates to the back of the globe
        let alpha = map(proj.z, -GLOBE_RADIUS, GLOBE_RADIUS, currentAlpha, currentAlpha * 0.1);

        push();
        translate(proj.x, proj.y);
        rotate(angle); // Apply tangent rotation

        fill(255, 200, 150, alpha); // Warm orange text color
        noStroke();
        textSize(16 * proj.scale);
        textAlign(CENTER, CENTER);
        
        // Add subtle glow to represent digital signal
        drawingContext.shadowBlur = 8;
        drawingContext.shadowColor = `rgba(255, 200, 150, ${alpha / 255})`;
        
        text(this.text, 0, 0);
        pop();
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}