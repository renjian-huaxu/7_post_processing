import { NormalBlending, SmoothShading } from "./Material";

export default class MeshDepthMaterial {

    constructor(parameters) {

        this.opacity = 1;
        this.shading = SmoothShading;
        this.blending = NormalBlending;
    
        this.wireframe = false;
        this.wireframe_linewidth = 1;
        this.wireframe_linecap = 'round';
        this.wireframe_linejoin = 'round';
    
        if ( parameters ) {
    
            if ( parameters.opacity !== undefined ) this.opacity  = parameters.opacity;
            if ( parameters.blending !== undefined ) this.blending = parameters.blending;
    
        }
    }

    toString() {
        return 'MeshDepthMaterial';
    }
}