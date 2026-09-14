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
        this.minRotation = 0
        this.rotation = 0
        this.maxRotation = 0
        this.rotationSpeed = 0
        this.shadow = null
        this.align = LEFT
        this.components = []
        this.anchorBottom = false
        this.onClickCallback = null
        this.toolTip = null
        this.fadeIn = false
        this.isToolTip = false
        this.hoverOverride = false
        this.isSelected = false
        this.isSelectable = false
        this.targetX = x
        this.targetY = y
        this.animFrames = 0
        this.animCallback = null
        this.fadeSpeed = 10
        this.selectedExtraScale = 0.2


    }

    animateTo(x, y, frames, callback = null) {
        this.targetX = x;
        this.targetY = y;
        this.animFrames = frames;
        this.animProg = 0;
        if (callback) {
            this.animCallback = callback;
        }
        return this;
    }

    completeAnimation() {
        this.x = this.targetX;
        this.y = this.targetY;
        this.animFrames = 0;
        if (this.animCallback) {
            this.animCallback()
        }
        return this;
    }

    setSelectable(boolean) {
        this.isSelectable = boolean
        return this
    }

    setSelected(boolean) {
        this.isSelected = boolean
        return this
    }

    toggleSelected() {
        if (this.isSelected) {
            console.log("Card toggled OFF")
            this.isSelected = false;
            chessBoard.resetAvailableMoves()
        } else {
            for (let card of cardDataManager.playerDeck) {
                card.iconBuffer.isSelected = false;
            }
            chessBoard.resetAvailableMoves()
            chessBoard.resetSelectedTiles()
            console.log("Card toggled ON")
            this.isSelected = true;
            let card = cardDataManager.getSelectedCard();
            availableMoves = card.getCardPlayTiles(chessBoard);
            chessBoard.markAvailableMoves(availableMoves);
        }
        return this;
    }

    setFadeIn(boolean, fadeSpeed = 10) {
        this.fadeIn = boolean
        this.fadeSpeed = fadeSpeed
        return this
    }

    setFadeOut(boolean, fadeSpeed = 10) {
        this.fadeOut = boolean
        this.fadeSpeed = fadeSpeed
        return this
    }

    setPosition(x, y) {
        this.x = x
        this.y = y
    }

    clearBuffer() {
        this.gBuffer.clear();
    }

    setToolTip(graphic) {
        graphic.isToolTip = true
        if (graphic.components.length > 0) {
            for (let component of graphic.components) {
                component.isToolTip = true
            }
        }
        this.toolTip = graphic;
        return this
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
        this.minRotation = minAngle
        this.maxRotation = maxAngle
        this.rotationSpeed = speed
        return this
    }

    setRotation(rotation) {
        this.rotation = rotation
        return this
    }

    onClick(callback) {
        this.onClickCallBack = callback
        return this
    }

    anchorToBottom(boolean) {
        this.anchorBottom = boolean
        return this;
    }

    getWidth() {
        return this.getDimensionsWithComponents("width")
    }

    getHeight() {
        return this.getDimensionsWithComponents("height")
    }

    getDimensionsWithComponents(type) {
        let buttonWidth = this.gBuffer.width
        let buttonHeight = this.gBuffer.height
        let buttonMinWidth = this.x
        let buttonMinHeight = this.y
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
        if (type == "width") {
            return buttonWidth
        } else if (type == "height") {
            return buttonHeight
        } else if (type == "minWidth") {
            return buttonMinWidth
        } else if (type == "minHeight") {
            return buttonMinHeight
    }
}

    handleClick(x, y, guiScale) {
        const mouseCoords = { x: x, y: y }; // Get the mouse coordinates
        let buttonX = this.x * guiScale; // Distance from left of the screen
        let buttonY = this.y * guiScale;
        if (this.align == RIGHT) {
            buttonX = windowWidth + buttonX
        } else if (this.align == CENTER) {
            buttonX = ((windowWidth+15)/2)
        }
        if (this.anchorBottom) {
            buttonY = windowHeight - (this.gBuffer.height - this.y) * guiScale
        }
        let buttonWidth = this.gBuffer.width * guiScale * this.scale; // Approximate width of the button
        let buttonHeight = this.gBuffer.height * guiScale * this.scale; // Approximate height of the button
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
                if (component.x < 0) {
                    buttonMinWidth = buttonMinWidth - abs(component.x)
                    buttonWidth += abs(component.x)
                }
                if (component.y < 0) {
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
            if  (typeof this.onClickCallBack == 'function') {

                this.onClickCallBack()
            }

        }


    }

    setShadow(boolean) {
        if (boolean) {
            let shadow = createGraphics(this.width, this.height);
            shadow.loadPixels();
            this.gBuffer.loadPixels();
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

        } else {
            this.shadow = null;
        }
        return this;
    }

    getShadow() {
        return this.shadow;
    }


    handleHover(mouseIsHovered, guiScale) {
        const maxOffsetX = this.maxOffsetX * guiScale;
        const maxOffsetY = this.maxOffsetY * guiScale;
        const lerpTime = this.lerpTime

        
        // Check if the mouse is within the button bounds
        // Calculate the hover animation offset
        if (mouseIsHovered) {
            if (this.toolTip) {
                let show = false
                let anotherCardIsHovered = false
                for (let card of cardDataManager.playerDeck) {
                    if (card.iconBuffer.isHovered) {
                        anotherCardIsHovered = true
                    }
                }
                if (this.isHovered) {
                    show = true
                }
                else if (this.isSelected && !anotherCardIsHovered) {
                    show = true
                }

                if (show == true) {
                    canvas2d.push()
                    this.toolTip.drawIcon(canvas2d, guiScale)
                    canvas2d.pop()
                } else {
                    this.toolTip.resetHoverAttributes()
                }
            
            
            }
            if (this.toolTip) {
                this.toolTip.hoverOverride = true
            }
            if (this.components.length > 0) {
                for (let component of this.components) {
                    component.hoverOverride = true
                }
            }
            
            
            
            if (!this.hoverStartTime) { // If the button has not been hovered over before, set the hoverStartTime to the current frameCount
                this.hoverStartTime = totalTime*targetFrameRate;
            }
            let hoverDuration = totalTime*targetFrameRate - this.hoverStartTime; // Difference between now and start time
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
            this.lastHovered = totalTime*targetFrameRate; // Set the lastHovered to the current frameCount
        } else {
            this.hoverStartTime = null; // Delete hoverStartTime attribute
            let pos = 0;
            if (this.hoverOffsetX !== 0 || this.hoverOffsetY !== 0) { // If the button is not being hovered over, calculate the return animation
                let returnDuration = totalTime*targetFrameRate - this.lastHovered; // Calculate how long to interpolate between the peak and 0
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
            if (this.toolTip) {
                if (this.toolTip.fadeStartTime) {
                    this.toolTip.fadeStartTime = null
                }
                this.toolTip.resetHoverAttributes()
            }
            if (this.components.length > 0) {
                for (let component of this.components) {
                    component.resetHoverAttributes()
            }
        }
        }
    }
    resetHoverAttributes() {
        this.hoverOverride = true
        this.hoverOverride = false
        this.hoverOffsetX = 0
        this.hoverOffsetY = 0
        this.peakX = null
        this.peakY = null
        this.hoverStartTime = null
        this.fadeStartTime = null
    }

    drawIcon(canvas, guiScale, translateX = 0, translateY = 0) {
        canvas.push()
        canvas.translate(translateX,translateY)
        canvas.imageMode(CORNERS)
        canvas.rectMode(CORNERS)
        const mouseCoords = { x: mouseX, y: mouseY }; // Get the mouse coordinates
        const downOffSet = -3 * guiScale

        if (this.animFrames !== 0) {
            this.animProg += 1;
            let t = this.animProg / this.animFrames;

            let newX = lerp(this.x, this.targetX, t);
            let newY = lerp(this.y, this.targetY, t);
            this.x = newX;
            this.y = newY;
            if (Math.round(this.x) == Math.round(this.targetX) && Math.round(this.y) == Math.round(this.targetY)) {
                this.x = this.targetX
                this.y = this.targetY
                this.completeAnimation();
            }
        }


        let buttonX = this.x * guiScale; // Distance from left of the screen
        let buttonY = this.y * guiScale;
        if (this.align == RIGHT) {
            buttonX = windowWidth + buttonX
        } else if (this.align == CENTER) {
            buttonX = ((windowWidth+15)/2)
            canvas.imageMode(CENTER)
        }
        if (this.anchorBottom) {
            buttonY = windowHeight - (this.gBuffer.height - this.y) * guiScale
        }
        let buttonWidth = this.gBuffer.width * guiScale * this.scale; // Approximate width of the button
        let buttonHeight = this.gBuffer.height * guiScale * this.scale; // Approximate height of the button
        let buttonMinWidth = buttonX
        let buttonMinHeight = buttonY
        let bounceOffsetX = 0
        let bounceOffsetY = 0
        let rotationOffset = 0

        if (this.fadeIn || this.fadeOut) {
            const fadeSpeed = this.fadeSpeed || 10;
            if (!this.fadeStartTime) {
            this.fadeStartTime = totalTime * targetFrameRate;
            }
            let fadeDuration = totalTime * targetFrameRate - this.fadeStartTime;
            let alpha;
            if (this.fadeIn) {
            alpha = map(fadeDuration, 0, fadeSpeed, 0, 255);
            } else if (this.fadeOut) {
            alpha = map(fadeDuration, 0, fadeSpeed, 255, 0);
            }
            alpha = constrain(alpha, 0, 255);
            canvas.tint(255, alpha);
        } else {
            this.fadeStartTime = null;
            canvas.noTint();
        }

        if (this.components.length > 0) {
            for (let component of this.components) {
                if (component.x > buttonWidth) {
                    buttonWidth = buttonWidth += component.x
                }
                if (component.y > buttonHeight) {
                    buttonHeight = buttonHeight += component.y
                }
                if (component.x < 0) {
                    buttonMinWidth = buttonMinWidth - abs(component.x)
                    buttonWidth += abs(component.x)
                }
                if (component.y < 0) {
                    buttonMinHeight = buttonMinHeight - abs(component.y)
                    buttonHeight += abs(component.y)
                }
            }
        }

        let mouseIsHovered = mouseCoords.x < buttonMinWidth + buttonWidth &&
            mouseCoords.x > buttonMinWidth &&
            mouseCoords.y < buttonMinHeight + buttonHeight &&
            mouseCoords.y > buttonMinHeight; // Check if the mouse is within the button bounds

        if (mouseIsHovered) {
            this.isHovered = true
        } else {
            this.isHovered = false
        }
        if (this.hoverOverride == true) {
            mouseIsHovered = true
        }

        if (this.isSelected == true) {
            mouseIsHovered = true
        }

        if (this.bounceX !== 0) {
            bounceOffsetX = sin((totalTime*targetFrameRate * this.bounceSpeed) + (this.bounceIndex * PI / 4)) * this.bounceX * guiScale;
        } 
        if (this.bounceY !== 0) {
            bounceOffsetY = sin((totalTime*targetFrameRate * this.bounceSpeed) + (this.bounceIndex * PI / 4)) * this.bounceY * guiScale;
        }
        if (this.maxRotation !== 0) {
            rotationOffset = sin((totalTime*targetFrameRate * this.rotationSpeed) + (16 * this.minRotation)) * 0.05; // Rotation offset for slight rotation
        }

        

        this.handleHover(mouseIsHovered, guiScale)

        if (debug) {
            push()
            canvas.ellipse(buttonMinWidth, buttonMinHeight, 10, 10)
            canvas.rect(buttonMinWidth , buttonMinHeight, buttonMinWidth + buttonWidth, buttonMinHeight + buttonHeight);
            canvas.ellipse(buttonMinWidth + buttonWidth, buttonMinHeight + buttonHeight, 10, 10)
            pop()
        }

        


        // Text Display for Menu Buttons
        canvas.translate(this.hoverOffsetX + bounceOffsetX, this.hoverOffsetY + bounceOffsetY, 0) // Translate the button based on the hoverOffset
        canvas.translate(buttonX, buttonY + downOffSet, 0) //Translate to the position of the button
        if (this.isSelected) {
            this.scaledX = buttonX
            this.scaledY = buttonY + downOffSet
        }
        canvas.push()
        let scale = this.scale
        canvas.scale(scale * guiScale)
        if (this.rotation) {
            canvas.translate(this.gBuffer.width/2, this.gBuffer.height/2)
            canvas.rotate(this.rotation + rotationOffset)
            canvas.translate(-this.gBuffer.width/2, -this.gBuffer.height/2)
        }
        if (this.minRotation) {
            canvas.translate(this.gBuffer.width, this.gBuffer.height);
            canvas.rotate(this.maxRotation + rotationOffset);
            canvas.translate(-this.gBuffer.width, -this.gBuffer.height);
        }
        if (!debug) {
            if (this.shadow) {
                canvas.push()
                canvas.translate(5, 5)
                canvas.image(this.shadow, 0, 0, this.width, this.height)
            
                canvas.pop()
            } 
        }

        if (this.backPlate) {
            canvas.push()
            this.gBuffer.fill(this.backPlate.r, this.backPlate.g, this.backPlate.b, 1)
            this.gBuffer.rect(0, 0, this.gBuffer.width, this.gBuffer.height)
            canvas.pop()
        }

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
        if (!debug) {
            canvas.image(this.gBuffer, 0, 0,
                this.gBuffer.width,
                this.gBuffer.height)

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
        this.color = null
        this.title = null
        this.titleSize = null

        this.initIcon();

    }
    initIcon() {
        const tempCanvas = document.createElement('canvas');
        const tempContext = tempCanvas.getContext('2d');
        tempContext.font = `${this.size}px plunge`; // Assuming 'plunge' is the font name
        const textWidth = tempContext.measureText(this.text).width; // Measure the actual text width
        const textHeight = this.size * 1.2; // Height is directly based on the size
        if (this.align === RIGHT) {
            this.x = this.x - this.getWidth() / 2;
        }
        this.gBuffer = createGraphics(this.getWidth(), this.getHeight());
        this.gBuffer.textFont(plunge); //I'll change this if I ever need to use a different font.
        this.gBuffer.textSize(this.size);
        this.gBuffer.textAlign(LEFT);
        this.textWithShadow(this.text);
    }


    countLineBreaks(text) {
        return (text.match(/<br>/g) || []).length;
    }

    textWithShadow(text) {
        this.gBuffer.push();
        this.gBuffer.noSmooth();
        this.gBuffer.textLeading(50);
        const lineCount = this.countLineBreaks(text) + 1;
        const startY = 0;
        this.gBuffer.translate(0, startY);
        this.gBuffer.fill(0);
        let lines = text.split('<br>');
        let arrayOffset = 0
        let titleOffset = 0
        if (this.title) { lines.unshift(this.title) }
        for (let i = 0; i < lines.length; i++) {
            let size = this.size
            let downOffset = 0
            if (i == 0 && this.titleSize) {
                size = this.titleSize
            }
            if (i !== 0 && this.titleSize) {
                downOffset = this.titleSize - this.size
            }
            this.gBuffer.textSize(size);
            this.gBuffer.text(lines[i], 5, (size + (i) * size) + 5 + downOffset);
        }
        if (this.color) {
            this.gBuffer.fill(this.color.r, this.color.g, this.color.b);
        } else {
            this.gBuffer.fill(255);
        }
        for (let i = 0; i < lines.length; i++) {
            let size = this.size
            let downOffset = 0
            if (i == 0 && this.titleSize) {
                size = this.titleSize
            }
            if (i !== 0 && this.titleSize) {
                downOffset = this.titleSize - this.size
            }
            this.gBuffer.textSize(size);
            this.gBuffer.text(lines[i], 0, downOffset + size + (i) * size);
        }
        this.gBuffer.pop();
    }

    setTitle(title, size) {
        this.title = title;
        this.titleSize = size;
        return this
    }

    updateText(text) {
        this.text = text;
        this.gBuffer.clear();
        this.textWithShadow(this.text);
        this.updateGraphics()
    }

    getTextWidth() {
        canvas2d.drawingContext.font = `${this.size}px plunge`; // Assuming 'plunge' is the font name
        return canvas2d.drawingContext.measureText(this.text).width + 20; // Measure the actual text width, with an offset for the shadow
    }

    getCharWidth(char) {
        canvas2d.drawingContext.font = `${this.size}px plunge`; // Assuming 'plunge' is the font name
        return canvas2d.drawingContext.measureText(char).width; // Measure the actual text width, with an offset for the shadow
    }

    setBackPlate(r, g, b) {
        this.backPlate = {r: r, g: g, b: b}
        return this
    }

    removeBackPlate() {
        this.backPlate = null
        return this
    }

    setColor(r, g, b) {
        this.color = {r: r, g: g, b: b}
        return this
    }

    updateGraphics() {
        this.gBuffer.clear();
        this.gBuffer.textFont(plunge);
        this.gBuffer.textSize(this.size);
        this.gBuffer.textAlign(LEFT);
        canvas2d.drawingContext.font = `${this.size}px plunge`; // Assuming 'plunge' is the font name
        const textWidth = canvas2d.drawingContext.measureText(this.text).width + 20; // Measure the actual text width, with an offset for the shadow
        const textHeight = this.size * 1.2; // Height is directly based on the size

        this.width = this.getDimensionsWithComponents("width")
        this.height = this.getDimensionsWithComponents("height")

        if (this.align === RIGHT) {
            this.x = this.permX - this.getWidth();
        }
        this.gBuffer.resizeCanvas(this.getTextWidth(), this.getHeight() + 10)
        push()
        this.textWithShadow(this.text);
        pop()
        return this
    }

    setText(text) {
        this.text = text;
        return this
    }

    getText() {
        return this.text;
    }

    setTextSize(size) {
        this.size = size;
        return this
    }

    scaleTextSizeToFit(width, height) {
        let textWidth = this.getTextWidth();
        let textHeight = this.size * 1.2; // Height is directly based on the size
        let margin = 0; // Define a small margin
        let widthScale = (width - margin * 2) / textWidth; // Adjust width to include margin
        let heightScale = (height - margin * 2) / textHeight; // Adjust height to include margin
        let scale = Math.min(widthScale, heightScale); // Choose the smaller scale to fit both width and height
        this.size = this.size * scale;
        return this;
    }

    getWidth() {
        return this.getDimensionsWithComponents("width")
    }

    getHeight() {
        return this.getDimensionsWithComponents("height")
    }

    getDimensionsWithComponents(type) {
        canvas2d.drawingContext.font = `${this.size}px plunge`; // Assuming 'plunge' is the font name
        const textWidth = canvas2d.drawingContext.measureText(this.text).width + 5; // Measure the actual text width, with an offset for the shadow
        const textHeight = canvas2d.drawingContext.measureText(this.text).height + 5; // Height is directly based on the size
        let buttonWidth = this.width //default values
        let buttonHeight = this.height
        let buttonMinWidth = this.x
        let buttonMinHeight = this.y
        if (textWidth > this.width) {
            buttonWidth = textWidth //Offset for shadow
        }
        if (textHeight > this.height) {
            buttonHeight = textHeight//Offset for shadow
        }

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
        if (type == "width") {
            return buttonWidth
        } else if (type == "height") {
            return buttonHeight
        } else if (type == "minWidth") {
            return buttonMinWidth
        } else if (type == "minHeight") {
            return buttonMinHeight
    }
}


}

class ImageButton extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.img = null;
        this.plate = false;

    }

    setImage(img) {
        this.img = img;
        return this
    }

    setPlate(r, g, b) {
        this.plate = {r: r, g: g, b: b}
        return this
    }

    deletePlate() {
        this.plate = false
        return this
    }

    getImage() {
        return this.img;
    }

    updateGraphics() {
        this.gBuffer.clear();
        this.gBuffer.resizeCanvas(this.width, this.height)
        if (this.plate) {
            this.gBuffer.fill(this.plate.r, this.plate.g, this.plate.b)
            this.gBuffer.rect(0, 0, this.width, this.height)
        }
        if (this.img) {
            this.gBuffer.image(this.img, 0, 0, this.width, this.height);
        }
        return this
    }
}

class OpponentNamePlate extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.text = new TextButton(this.width*0.75, this.height*0.5, 0, 0).setText("Waiting...").setTextSize(50).scaleTextSizeToFit(width*0.6, this.height*0.4).updateGraphics().setShadow(true);
        this.vs = new TextButton(this.width*0.25, this.height*0.5, 0, 0).setText("VS").setTextSize(50).updateGraphics().setShadow(true);
        this.plate = true;
        this.personIcon = new ImageButton(personicon.width, personicon.height, 0, 0).setImage(personicon.get(0, 0 , personicon.width, personicon.height)).updateGraphics().setShadow(true)
        this.diamond = new ImageButton(manadiamondred.width, manadiamondred.height, 0, 0).setImage(manadiamondred.get(0, 0 , manadiamondred.width, manadiamondred.height)).updateGraphics().setShadow(true)
        this.greyDiamond = new ImageButton(manadiamondgrey.width, manadiamondgrey.height, 0, 0).setImage(manadiamondgrey.get(0, 0 , manadiamondgrey.width, manadiamondgrey.height)).updateGraphics().setShadow(true)
        this.energy = 0;
        this.maxEnergy = 6;
        this.initIcon();
    }

    getText() {
        return this.text.getText();
    }

    update(energy) {
        this.energy = energy;
        this.initIcon(true)
    }

    initIcon(update) {
        let personIcon = this.personIcon.getGraphicsObject()
        let personIconShadow = this.personIcon.getShadow()
        let diamond = this.diamond.getGraphicsObject()
        let diamondShadow = this.diamond.getShadow()
        let greyDiamond = this.greyDiamond.getGraphicsObject()
        let text = this.text.getGraphicsObject()
        let vsText = this.vs.getGraphicsObject()
        if (update) {
            this.clearBuffer();
            this.gBuffer.resizeCanvas(this.width, this.height)
        } else {
            this.gBuffer = createGraphics(this.width, this.height)
        }
        this.gBuffer.fill(255, 49, 40)
        this.gBuffer.rect(this.width*0.20, 0, this.width*0.8, this.height*0.5)
        this.gBuffer.push()
        this.gBuffer.translate(this.width *0.75 + 25, 10)
        this.gBuffer.scale(0.25)
        this.gBuffer.image(personIconShadow, 15, 15, personIcon.width, personIcon.height)
        this.gBuffer.image(personIcon, 0, 0, personIcon.width, personIcon.height)
        this.gBuffer.pop()
        this.gBuffer.image(text, this.width*0.25, 0, text.width, text.height)
        this.gBuffer.image(vsText, 0, 0, vsText.width, vsText.height)
        
        this.gBuffer.push()
        this.gBuffer.translate(this.width*0.2, this.height*0.55)
        for (let i = 0; i < this.maxEnergy; i++) {
            this.gBuffer.push()
            this.gBuffer.scale(0.2)
            this.gBuffer.translate(i*diamond.width, 0)
            //this.gBuffer.rect(0, 0, diamond.width, diamond.height)
            this.gBuffer.image(diamondShadow, 15, 15, diamond.width, diamond.height)
            this.gBuffer.image(i < this.energy ? diamond : greyDiamond, 0, 0, diamond.width, diamond.height)
            this.gBuffer.pop()
        }
        this.gBuffer.pop()
    }

    updateText(text) {
        this.text.updateText(text);
        this.text.scaleTextSizeToFit(this.width*0.6, this.height*0.4).updateGraphics()
        this.initIcon(true)
        return this
    }

    getGraphicsObject() {
        return this.gBuffer;
    }
}

class PlayerEnergyBar extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.energy = 0;
        this.text = new TextButton(this.width*0.75, this.height*0.5, 0, 0).setText("Energy Meter").setTextSize(50).scaleTextSizeToFit(this.width*0.75, this.height*0.40).updateGraphics().setShadow(true);
        this.energyNum = new TextButton(this.width*0.25, this.height, 0, 0).setText(this.energy.toString()).setTextSize(50).scaleTextSizeToFit(this.height, this.height).updateGraphics().setShadow(true);
        this.diamond = new ImageButton(manadiamondblue.width, manadiamondblue.height, 0, 0).setImage(manadiamondblue.get(0, 0 , manadiamondblue.width, manadiamondblue.height)).updateGraphics().setShadow(true)
        this.greyDiamond = new ImageButton(manadiamondgrey.width, manadiamondgrey.height, 0, 0).setImage(manadiamondgrey.get(0, 0 , manadiamondgrey.width, manadiamondgrey.height)).updateGraphics().setShadow(true)
        this.circle = new ImageButton(manaorb.width, manaorb.height, 0, 0).setImage(manaorb.get(0, 0 , manaorb.width, manaorb.height)).updateGraphics().setShadow(true)
        this.maxEnergy = 6;
        this.toolTipBuffer = new TextButton(600, 400, 50, windowHeight * 0.2)
            .setTitle("Energy", 70)
            .setText("Spend energy to cast cards.<br><br>Capture a pawn: +1<br>Capture any other piece: +2<br><br>Maximum: " + this.maxEnergy)
            .setTextSize(50)
            .setAlign(LEFT)
            .setFadeIn(true)
            .setHoverEffect(20, 0, 0.5)
            .updateGraphics()
            .setShadow(true)
        this.setToolTip(this.toolTipBuffer)

        this.initIcon();
    }

    update(energy) {
        this.energy = energy;
        this.energyNum.updateText(this.energy.toString())
        this.initIcon(true)
    }

    getEnergy() {
        return this.energy;
    }

    getText() {
        return this.text.getText();
    }

    initIcon(update) {
        let diamond = this.diamond.getGraphicsObject()
        let diamondShadow = this.diamond.getShadow()
        let greyDiamond = this.greyDiamond.getGraphicsObject()
        let circle = this.circle.getGraphicsObject()
        let circleShadow = this.circle.getShadow()
        let text = this.text.getGraphicsObject()
        let energyNum = this.energyNum.getGraphicsObject()
        if (update) {
            this.clearBuffer();
            this.gBuffer.resizeCanvas(this.width, this.height)
        } else {
            this.gBuffer = createGraphics(this.width, this.height)
        }
        this.gBuffer.translate(5, 5)
        this.gBuffer.image(circleShadow, 0, 0, this.height-5, this.height-5)
        this.gBuffer.image(circle, -5, -5, this.height-5, this.height-5) //Can do this because equal length sides
        //this.gBuffer.image(energyNum, (this.height-5)/3, -(this.height-5)/8, energyNum.width, energyNum.height)
        this.gBuffer.image(energyNum, (this.height-5)/4, -(this.height-5)/16, energyNum.width, energyNum.height)
        this.gBuffer.image(text, this.height + (this.diamond.width*0.1) - 5, this.diamond.height/8, text.width, text.height)
        this.gBuffer.push()
        this.gBuffer.translate(this.height + 5, this.height*0.62)
        for (let i = 0; i < this.energy; i++) {
            this.gBuffer.push()
            this.gBuffer.scale(0.3)
            this.gBuffer.translate(i*diamond.width*0.9, 0)
            //this.gBuffer.rect(0, 0, diamond.width, diamond.height)
            this.gBuffer.image(diamondShadow, 5, 5, diamond.width, diamond.height)
            this.gBuffer.image(diamond, -10, -10, diamond.width, diamond.height)
            this.gBuffer.pop()
        }
        for (let i = this.energy; i < this.maxEnergy; i++) {
            this.gBuffer.push()
            this.gBuffer.scale(0.3)
            this.gBuffer.translate(i*diamond.width*0.9, 0)
            //this.gBuffer.rect(0, 0, diamond.width, diamond.height)
            this.gBuffer.image(diamondShadow, 5, 5, diamond.width, diamond.height)
            this.gBuffer.image(greyDiamond, -10, -10, diamond.width, diamond.height)
            this.gBuffer.pop()
        }

        this.gBuffer.pop()


    }

    updateText(text) {
        this.text.updateText(text);
        this.text.scaleTextSizeToFit(this.width*0.6, this.height*0.4).updateGraphics()
        this.initIcon(true)
        return this
    }

    getGraphicsObject() {
        return this.gBuffer;
    }
}

class PlayerNamePlate extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.text = new TextButton(this.width*0.75, this.height*0.5, 0, 0).setText(nickname).setTextSize(50).scaleTextSizeToFit(width*0.70, this.height).updateGraphics().setShadow(true);
        this.personIcon = new ImageButton(personicon.width, personicon.height, 0, 0).setImage(personicon.get(0, 0 , personicon.width, personicon.height)).updateGraphics().setShadow(true)
        this.initIcon();
    }

    getText() {
        return this.text.getText();
    }

    initIcon(update) {
        let personIcon = this.personIcon.getGraphicsObject()
        let personIconShadow = this.personIcon.getShadow()
        let text = this.text.getGraphicsObject()
        if (update) {
            this.clearBuffer();
            this.gBuffer.resizeCanvas(this.width, this.height)
        } else {
            this.gBuffer = createGraphics(this.width, this.height)
        }
        //this.gBuffer.noStroke()
        this.gBuffer.fill(0, 150, 255)
        this.gBuffer.rect(0, 0, this.width, this.height)
        this.gBuffer.push()
        this.gBuffer.translate(25, 10)
        this.gBuffer.scale(0.25)
        this.gBuffer.image(personIconShadow, 15, 15, personIcon.width, personIcon.height)
        this.gBuffer.image(personIcon, 0, 0, personIcon.width, personIcon.height)
        this.gBuffer.pop()
        this.gBuffer.image(text, this.width*0.3, text.height/2.5, text.width, text.height)
    }

    updateText(text) {
        this.text.updateText(text);
        this.text.scaleTextSizeToFit(this.width*0.6, this.height*0.4).updateGraphics()
        this.initIcon(true)
        return this
    }

    getGraphicsObject() {
        return this.gBuffer;
    }
}

class Card extends ImageButton {
    constructor(width, height, x, y) {
        super(width, height, x, y);
    }
    
}


class ChatInput extends Button {
    constructor(width, height, x, y) {
        super(width, height, x, y);
        this.text = new TextButton(this.width, this.height, 0, 0).setText("Chat [Enter]").setTextSize(50).scaleTextSizeToFit(this.width, this.height).updateGraphics().setShadow(true);
        this.focused = false
        this.textHeld = []
        this.initIcon()
}

    initIcon(update) {
        let text = this.text.getGraphicsObject()
        if (update) {
            this.clearBuffer();
            this.gBuffer.resizeCanvas(this.width, this.height)
        } else {
            this.gBuffer = createGraphics(this.width, this.height)
        }
        this.gBuffer.noFill()
        this.gBuffer.rect(0, 0, this.width, this.height)
        this.gBuffer.translate(9, -5)
        this.gBuffer.scale(0.9)
        this.gBuffer.push()
        for(let i = 0; i < this.textHeld.length; i++) {
            let text = this.textHeld[i].getGraphicsObject()
            this.gBuffer.image(text, 0, 0, text.width, text.height)
            this.gBuffer.translate(text.width, 0)
        this.gBuffer.pop()
    }
}

    openChatBox() {
        this.focused = true
        this.updateText(this.textHeld)
        return this;
    }

    updateText(text) {
        this.text.updateText(text);
        this.text.scaleTextSizeToFit(this.width, this.height).updateGraphics()
        this.initIcon(true)
        return this
    }

    typeCharacter(character) {
        if (character == "Backspace") {
            this.textHeld.pop()
        }
        else {
            this.textHeld.push(new TextButton(50, 50, 0, 0).setText(character).setTextSize(50).updateGraphics().setShadow(true))
        }

    }

    displayHeldText() {
        
    }

    getText() {
        return this.textHeld
    }

    setHeldText(text) {
        this.textHeld = text
        this.updateText(text)
        return this
    }

    getGraphicsObject() {
        return this.gBuffer;
    }
    }
