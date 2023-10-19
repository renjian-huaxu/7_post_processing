
import Color from "../core/Color";

export default class FogExp2 {

    constructor(hex, density) {

        this.color = new Color( hex );
        this.density = density || 0.00025;
        
    }

}