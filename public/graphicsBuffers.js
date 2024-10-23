class Button {
    constructor(width, height, x, y) {
        this.width = width;
        this.height = height;
        this.x = x;
        this.y = y;
        this.gBuffer = createGraphics(this.width, this.height);
        this.maxOffsetX = 0
        this.maxOffsetY = 0
        this.lerpTime = 0
        this.hoverOffsetX = 0;
        this.hoverOffsetY = 0;
        this.hoverStartTime = null;
        this.lastHovered = null;
        this.peakX = null;
        this.peakY = null;
        this.bounceSpeed = 0
        this.bounceX = 0
        this.bounceY = 0
        this.bounceIndex = 0
        this.scale = 1
        this.rotation = 0
        this.maxRotation = 0
        this.rotationSpeed = 0
        this.shadow = null
        this.align = CENTER
        this.components = []

    }

    clearBuffer() {
        this.gBuffer.clear();
    }

    initIcon() {
        throw new Error('initIcon() must be implemented by subclass');
    }

    componentOf(component) {
        component.addComponent(this)
        return this
    }

    addComponent(component) {
        this.components.push(component)
        return this
    }

    setHoverEffect(maxOffsetX, maxOffsetY, lerpTime) {
        this.maxOffsetX = maxOffsetX
        this.maxOffsetY = maxOffsetY
        this.lerpTime = lerpTime
        return this
    }

    setScale(scale) {
        this.scale = scale
        return this
    }

    setBounceEffect(maxX, maxY, speed, index) {
        this.bounceSpeed = speed
        this.bounceX = maxX
        this.bounceY = maxY
        this.bounceIndex = index
        return this
    }

    setRotateEffect(maxAngle, minAngle, speed) {
        this.rotation = minAngle
        this.maxRotation = maxAngle
        this.rotationSpeed = speed
        return this
    }

    setRotation(rotation) {
        this.rotation = rotation
        return this
    }

    onClick(callback) {
        this.onClick = callback
        return this
    }

    handleClick(x, y, guiScale) {
        const mouseCoords = { x: x, y: y }; // Get the mouse coordinates
        let buttonX = this.x * guiScale; // Distance from left of the screen
        let buttonY = this.y * guiScale;
        if (this.align == RIGHT) {
            buttonX = windowWidth + buttonX
        }
        let buttonWidth = this.gBuffer.width * guiScale; // Approximate width of the button
        let buttonHeight = this.gBuffer.height * guiScale; // Approximate height of the button
        let buttonMinWidth = buttonX
        let buttonMinHeight = buttonY



        if (this.components.length > 0) {
            for (let component of this.components) {
                if (component.x > buttonWidth) {
                    buttonWidth = buttonWidth += component.x
                }
                if (component.y > buttonHeight) {
                    buttonHeight = buttonHeight += component.y
                }
                if (component.x < buttonMinWidth) {
                    buttonMinWidth = buttonMinWidth - abs(component.x)
                    buttonWidth += abs(component.x)
                }
                if (component.y < buttonMinHeight) {
                    buttonMinHeight = buttonMinHeight - abs(component.y)
                    buttonHeight += abs(component.y)
                }
            }
        }

        const mouseIsHovered = mouseCoords.x < buttonMinWidth + buttonWidth &&
            mouseCoords.x > buttonMinWidth &&
            mouseCoords.y < buttonMinHeight + buttonHeight &&
            mouseCoords.y > buttonMinHeight; // Check if the mouse is within the button bounds

        if (mouseIsHovered) {
            console.log("CLICK")
            if (this.onClick) {
                this.onClick()
            }

        }

    }

    setShadow(boolean) {
        if (boolean) {
            let shadow = createGraphics(this.width, this.height);
            shadow.loadPixels();
            this.gBuffer.loadPixels();

            console.log("gBuffer pixels:", this.gBuffer.pixels.length);
            console.log("Shadow buffer initialized with dimensions:", this.width, this.height);

            let c = 0;
            for (let x = 0; x < this.width; x++) {
                for (let y = 0; y < this.height; y++) {
                    let index = (x + y * this.width) * 4;
                    let alpha = this.gBuffer.pixels[index + 3];
                    if (alpha > 0) {
                        shadow.pixels[index] = 0;     // Red
                        shadow.pixels[index + 1] = 0; // Green
                        shadow.pixels[index + 2] = 0; // Blue
                        shadow.pixels[index + 3] = this.gBuffer.pixels[index + 3]; // Alpha
                        
                        c++;
                    }
                }
            }
            shadow.updatePixels();
            this.shadow = shadow;

            console.log("Shadow buffer updated with non-transparent pixels.");
            console.log("Shadow pixels:", shadow.pixels.length);
            console.log("Shadow pixels after:", c);
        } else {
            this.shadow = null;
            console.log("Shadow buffer cleared.");
        }
        return this;
    }

    handleHover(mouseIsHovered, guiScale) {
        const maxOffsetX = this.maxOffsetX * guiScale;
        const maxOffsetY = this.maxOffsetY * guiScale;
        const lerpTime = this.lerpTime
        // Check if the mouse is within the button bounds

        // Calculate the hover animation offset
        if (mouseIsHovered) {
            if (!this.hoverStartTime) { // If the button has not been hovered over before, set the hoverStartTime to the current frameCount
                this.hoverStartTime = frameCount;
            }
            let hoverDuration = frameCount - this.hoverStartTime; // Difference between now and start time
            if (hoverDuration / 100 > lerpTime) {
                hoverDuration = lerpTime * 100; // If it's over the lerpTime, set it to the lerpTime
            }
            if (maxOffsetX !== 0) { 
                this.hoverOffsetX = easeOutElastic(hoverDuration / 100, 0, maxOffsetX, lerpTime); // Actually do the calculation
                this.peakX = this.hoverOffsetX; // Set the peak to the current hoverOffset 
                }
            if (maxOffsetY !== 0) { 
                this.hoverOffsetY = easeOutElastic(hoverDuration / 100, 0, maxOffsetY, lerpTime); 
                this.peakY = this.hoverOffsetY; // Set the peak to the current hoverOffset
                } // Actually do the calculation
            this.lastHovered = frameCount; // Set the lastHovered to the current frameCount
        } else {
            this.hoverStartTime = null; // Delete hoverStartTime attribute
            let pos = 0;
            if (this.hoverOffsetX !== 0 || this.hoverOffsetY !== 0) { // If the button is not being hovered over, calculate the return animation
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
    }

    drawIcon(canvas, guiScale) {
        canvas.push()
        canvas.translate(0,0)
        //if (this.align == LEFT) {
        //    canvas.translate(0, 0)
        //} else if (this.align == RIGHT) {
        //    canvas.translate(windowWidth, 0)
        //}
        canvas.imageMode(CORNERS)
        canvas.rectMode(CORNERS)
        const mouseCoords = { x: mouseX, y: mouseY }; // Get the mouse coordinates
        const downOffSet = -3 * guiScale
        let buttonX = this.x * guiScale; // Distance from left of the screen
        let buttonY = this.y * guiScale;
        if (this.align == RIGHT) {
            buttonX = windowWidth + buttonX
        }
        let buttonWidth = this.gBuffer.width * guiScale; // Approximate width of the button
        let buttonHeight = this.gBuffer.height * guiScale; // Approximate height of the button
        let buttonMinWidth = buttonX
        let buttonMinHeight = buttonY
        let bounceOffsetX = 0
        let bounceOffsetY = 0
        let rotationOffset = 0



        if (this.components.length > 0) {
            for (let component of this.components) {
                if (component.x > buttonWidth) {
                    buttonWidth = buttonWidth += component.x
                }
                if (component.y > buttonHeight) {
                    buttonHeight = buttonHeight += component.y
                }
                if (component.x < buttonMinWidth) {
                    buttonMinWidth = buttonMinWidth - abs(component.x)
                    buttonWidth += abs(component.x)
                }
                if (component.y < buttonMinHeight) {
                    buttonMinHeight = buttonMinHeight - abs(component.y)
                    buttonHeight += abs(component.y)
                }
            }
        }

        if (this.bounceX !== 0) {
            bounceOffsetX = sin((frameCount * this.bounceSpeed) + (this.bounceIndex * PI / 4)) * this.bounceX*guiScale;
        } 
        if (this.bounceY !== 0) {
            bounceOffsetY = sin((frameCount * this.bounceSpeed) + (this.bounceIndex * PI / 4)) * this.bounceY*guiScale;
        }
        if (this.maxRotation !== 0) {
            rotationOffset = sin((frameCount * this.rotationSpeed) + (16 * this.rotation)) * 0.05; // Rotation offset for slight rotation

        }

        const mouseIsHovered = mouseCoords.x < buttonMinWidth + buttonWidth &&
            mouseCoords.x > buttonMinWidth &&
            mouseCoords.y < buttonMinHeight + buttonHeight &&
            mouseCoords.y > buttonMinHeight; // Check if the mouse is within the button bounds

        this.handleHover(mouseIsHovered, guiScale)

        if (debug) {
            push()
            canvas.ellipse(buttonMinWidth, buttonMinHeight, 10, 10)
            //canvas.rect(buttonMinWidth, buttonMinHeight, buttonWidth, buttonHeight);
            canvas.rect(buttonMinWidth , buttonMinHeight, buttonMinWidth + buttonWidth, buttonMinHeight + buttonHeight);
            pop()
        }
        



        // Text Display for Menu Buttons
        canvas.translate(this.hoverOffsetX + bounceOffsetX, this.hoverOffsetY + bounceOffsetY, 0) // Translate the button based on the hoverOffset
        canvas.translate(buttonX, buttonY + downOffSet, 0) // Align the button text
        canvas.push()
        canvas.scale(guiScale)
        if (this.rotation) {
            canvas.translate(this.gBuffer.width, this.gBuffer.height);
            canvas.rotate(this.maxRotation + rotationOffset);
            canvas.translate(-this.gBuffer.width, -this.gBuffer.height);
        }
        if (this.shadow) {
            canvas.push()
            canvas.translate(5, 5)
            canvas.image(this.shadow, 0, 0, this.width, this.height)
           
            canvas.pop()
        } 

        canvas.image(this.gBuffer, 0, 0,
            this.gBuffer.width,
            this.gBuffer.height)

        if (this.components.length > 0) {
            for (let component of this.components) {
                let componentGbuffer = component.getGraphicsObject()
                canvas.push()
                canvas.translate(component.x, component.y)
                canvas.scale(component.scale)
                if (component.shadow) {
                    canvas.push()
                    canvas.translate(20, 20)
                    canvas.image(component.shadow, 0, 0, component.width, component.height)
                    
                    canvas.pop()
                }
                canvas.image(componentGbuffer, 0, 0, componentGbuffer.width, componentGbuffer.height)
                if (debug) {
                    ellipse(0, 0, 10, 10)
                }
                canvas.pop()
            }
        }
        canvas.pop()
        fill(255)
    }

    getGraphicsObject() {
        return this.gBuffer;
    }

    setAlign(align) {
        this.align = align
        return this
    }
}

class TextButton extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.text = "Text Button";
        this.size = 50;
        this.align = LEFT;
        this.permX = x; //for dealing with text alignment

        this.initIcon();

    }
    initIcon() {
        const textWidth = this.text.length * this.size * 0.55; // Adjust width based on size and character width approximation
        const textHeight = this.size * 1.2; // Height is directly based on the size
        if (this.align === RIGHT) {
            this.x = this.x - textWidth / 2;
        }
        this.gBuffer = createGraphics(textWidth, textHeight);
        this.gBuffer.textFont(plunge); //I'll change this if I ever need to use a different font.
        this.gBuffer.textSize(this.size);
        this.gBuffer.textAlign(LEFT);
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

    updateGraphics() {
        this.gBuffer.clear();
        this.gBuffer.textFont(plunge);
        this.gBuffer.textSize(this.size);
        this.gBuffer.textAlign(LEFT);
        const textWidth = this.text.length * this.size * 0.55;
        const textHeight = this.size * 1.2;
        if (this.align === RIGHT) {
            this.x = this.permX - textWidth;
        }
        this.gBuffer.resizeCanvas(textWidth, textHeight);
        this.textWithShadow(this.text);
        return this
    }

    setText(text) {
        this.text = text;
        return this
    }

    setTextSize(size) {
        this.size = size;
        return this
    }


}

class ImageButton extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.img = null;

    }

    setImage(img) {
        this.img = img;
        return this
    }

    updateGraphics() {
        this.gBuffer.clear();
        this.gBuffer.image(this.img, 0, 0, this.width, this.height);
        return this
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
