import Object3D from "./Object3D";

const LineStrip = 0;
const LinePieces = 1;

export default class Line extends Object3D {

    constructor(geometry, materials, type) {
        super()

        this.geometry = geometry;
        this.materials = materials instanceof Array ? materials : [ materials ];
        this.type = ( type != undefined ) ? type : LineStrip;

    }
}

export {
    LineStrip,
    LinePieces
}