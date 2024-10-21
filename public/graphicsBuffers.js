class Button {
    constructor(width, height, x, y) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        console.log(this.width, this.height, this.x, this.y)
        this.gBuffer = createGraphics(this.width, this.height);
        this.maxOffsetX = 0
        this.maxOffsetY = 0
        this.lerpTime = 0
    }

    clearBuffer() {
        this.gBuffer.clear();
    }

    initIcon() {
        throw new Error('initIcon() must be implemented by subclass');
    }

    setHoverEffect(maxOffsetX, maxOffsetY, lerpTime) {
        this.maxOffsetX = maxOffsetX
        this.maxOffsetY = maxOffsetY
        this.lerpTime = lerpTime
    }

    drawIcon(canvas, guiScale) {
        canvas.push()
        let mouseIsHovered = false; // Whether the mouse is hovering over the button
        let buttonX = this.x * this.guiScale; // Distance from left of the screen
        let buttonY = this.y * guiScale;
        let buttonWidth = this.gBuffer.width * guiScale; // Approximate width of the button
        let buttonHeight = this.gBuffer.width * guiScale; // Approximate height of the button
        let mouseCoords = { x: mouseX, y: mouseY }; // Get the mouse coordinates
        let maxOffsetX = this.maxOffsetX * guiScale;
        let maxOffsetY = this.maxOffsetY * guiScale;
        let lerpTime = this.lerpTime
        // Check if the mouse is within the button bounds
        if (
            mouseCoords.x < buttonX + buttonWidth &&
            mouseCoords.x > buttonX &&
            mouseCoords.y < buttonY + buttonHeight &&
            mouseCoords.y > buttonY
        ) {
            mouseIsHovered = true; // If the mouse is hovering over the button, set mouseIsHovered to true
        }

        // Calculate the hover animation offset
        if (mouseIsHovered) {
            if (!this.hoverStartTime) { // If the button has not been hovered over before, set the hoverStartTime to the current frameCount
                this.hoverStartTime = frameCount;
            }
            let hoverDuration = frameCount - this.hoverStartTime; // Difference between now and start time
            if (hoverDuration / 100 > lerpTime) {
                hoverDuration = lerpTime * 100; // If it's over the lerpTime, set it to the lerpTime
            }
            if (maxOffsetX = 0) { 
                this.hoverOffsetX = easeOutElastic(hoverDuration / 100, 0, maxOffsetX, lerpTime); // Actually do the calculation
                this.peakX = this.hoverOffsetX; // Set the peak to the current hoverOffset 
                }
            if (maxOffsetY = 0) { 
                this.hoverOffsetY = easeOutElastic(hoverDuration / 100, 0, maxOffsetY, lerpTime); 
                this.peakY = this.hoverOffsetX; // Set the peak to the current hoverOffset
                } // Actually do the calculation
            
            this.lastHovered = frameCount; // Set the lastHovered to the current frameCount
        } else {
            this.hoverStartTime = null; // Delete hoverStartTime attribute
            let pos = 0;
            if (this.hoverOffset > 0) {
                let returnDuration = frameCount - this.lastHovered; // Calculate how long to interpolate between the peak and 0
                if (returnDuration / 100 > lerpTime) {
                    pos = lerpTime;
                } else {
                    pos = returnDuration / 100;
                }
                if (this.peakX) {
                    this.hoverOffsetX = this.peakX - easeOutElastic(pos, 0, this.peakX, lerpTime);
                }
                if (this.peakY) {
                    this.hoverOffsetY = this.peakY - easeOutElastic(pos, 0, this.peakY, lerpTime);
                }
            } else {
                this.peakX = null
                this.peakY = null
            }
        }

        // Text Display for Menu Buttons
        let downOffSet = -3 * guiScale
        canvas.translate(this.hoverOffsetX, this.hoverOffsetY, 0) // Translate the button based on the hoverOffset
        canvas.translate(buttonX, buttonY + downOffSet, 0) // Align the button text
        canvas.push()
        canvas.scale(guiScale)
        canvas.imageMode(CORNERS)
        canvas.image(this.gBuffer, 0, 0,
            this.gBuffer.width,
            this.gBuffer.height)
        canvas.pop()
    }

    getGraphicsObject() {
        return this.gBuffer;
    }
}

class TextBuffer extends Button {
    constructor(width, height, x, y, text, size, align) {
        super(width, height, x, y);
        this.text = text;
        this.size = size;
        this.align = align
        this.initIcon();

    }
    initIcon() {
        const textWidth = this.text.length * this.size * 0.5; // Adjust width based on size and character width approximation
        const textHeight = this.size * 1.2; // Height is directly based on the size
        console.log("TextBuffer Attributes:");
        console.log("Text:", this.text);
        console.log("Text Width:", textWidth);
        console.log("Text Height:", textHeight);
        console.log("Size:", this.size);
        console.log("Align:", this.align);
        //console.log("Buffer:", this.gBuffer);
        console.log(textWidth, textHeight)
        this.gBuffer = createGraphics(textWidth, textHeight);
        this.gBuffer.textFont(plunge); //I'll change this if I ever need to use a different font.
        this.gBuffer.textSize(this.size);
        this.gBuffer.textAlign(this.align);
        this.textWithShadow(this.text);
    }

    textWithShadow(text) {
        this.gBuffer.fill(0)
        this.gBuffer.text(text, 5, this.gBuffer.height - 15)
        this.gBuffer.fill(255)
        this.gBuffer.text(text, 0, this.gBuffer.height - 20 + 0)
    }

    updateText(text) {
        this.text = text;
        this.gBuffer.clear();
        this.textWithShadow(this.text);
    }

}



class HamburgerMenuButton extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.text = new TextBuffer('☰', 20, CENTER);
        this.initIcon();
    }

    initIcon() {
        this.clearBuffer();
        this.gBuffer.fill(0, 150, 255);
        this.gBuffer.rect(0, 0, this.size, this.size);
        this.gBuffer.fill(0)
        this.gBuffer.rect(-5, -5, this.size, this.size)
        this.gBuffer.image(this.text.gBuffer, this.width/2 - this.text.gBuffer.width/2, this.height/2 - this.text.gBuffer.height/2);

    }

    drawIcon(canvas) {
        canvas.image(this.gBuffer, this.x, this.y);
    }

    getGraphicsObject() {
        return this.gBuffer;
    }
}
