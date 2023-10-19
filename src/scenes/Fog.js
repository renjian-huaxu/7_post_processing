import Color from "../core/Color";

export default class Fog {

    constructor(hex, near, far) {

        this.color = new Color( hex );
        this.near = near || 1;
        this.far = far || 1000;
        
    }

}