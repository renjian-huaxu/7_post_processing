import Object3D from "./Object3D";

export default class Particle extends Object3D {
    
    constructor(materials) {

        super()
        
        this.materials = materials instanceof Array ? materials : [ materials ];
        this.autoUpdateMatrix = false;
    }
}