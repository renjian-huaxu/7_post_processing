import Object3D from "./Object3D";

export default class ParticleSystem extends Object3D {

    constructor(geometry, materials) {
        super()

        this.geometry = geometry;
        this.materials = materials instanceof Array ? materials : [ materials ];
        
        this.sortParticles = false;
    
    }
}