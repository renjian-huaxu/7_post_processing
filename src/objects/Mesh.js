
import Object3D from "./Object3D";

export default class Mesh extends Object3D {

    constructor(geometry, materials) {
        super()

        this.geometry = geometry;
        this.materials = materials instanceof Array ? materials : [ materials ];

        this.flipSided = false;
        this.doubleSided = false;

        this.overdraw = false;

        this.geometry.boundingSphere || this.geometry.computeBoundingSphere();
    }
}