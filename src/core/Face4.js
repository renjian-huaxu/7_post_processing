import Vector3 from "./Vector3";

export default class Face4 {

    constructor(a, b, c, d, normal, materials) {
        this.a = a;
        this.b = b;
        this.c = c;
        this.d = d;
    
        this.centroid = new Vector3();
        this.normal = normal instanceof Vector3 ? normal : new Vector3();
        this.vertexNormals =  normal instanceof Array ? normal : [];
    
        this.materials = materials instanceof Array ? materials : [ materials ];
    }

    toString() {
        return 'MTHREE.Face4 ( ' + this.a + ', ' + this.b + ', ' + this.c + ' ' + this.d + ' )';
    }

}