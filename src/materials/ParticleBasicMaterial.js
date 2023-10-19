
import Color from "../core/Color";
import Vector2 from "../core/Vector2";
import { NormalBlending } from "./Material";

export default class ParticleBasicMaterial {
    
    constructor(parameters) {
        this.color = new Color( 0xffffff );
        this.map = null;
        this.opacity = 1;
        this.size = 1;
        
        this.vertex_colors = false;
        
        this.blending = NormalBlending;
    
        this.offset = new Vector2(); // TODO: expose to parameters
    
        if ( parameters ) {
    
            if ( parameters.color !== undefined ) this.color.setHex( parameters.color );
            if ( parameters.map !== undefined ) this.map = parameters.map;
            if ( parameters.opacity !== undefined ) this.opacity  = parameters.opacity;
            if ( parameters.size !== undefined ) this.size = parameters.size;
            if ( parameters.blending !== undefined ) this.blending = parameters.blending;
            if ( parameters.vertex_colors !== undefined ) this.vertex_colors = parameters.vertex_colors;
    
        }

    }

    toString() {
		return 'THREE.ParticleBasicMaterial (<br/>' +
			'color: ' + this.color + '<br/>' +
			'map: ' + this.map + '<br/>' +
			'opacity: ' + this.opacity + '<br/>' +
			'size: ' + this.size + '<br/>' +
			'blending: ' + this.blending + '<br/>' +
			'vertex_colors: ' + this.vertex_colors + '<br/>' +
			')';
    }
}