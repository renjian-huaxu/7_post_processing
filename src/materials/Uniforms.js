import Color from "../core/Color";
import Vector3 from "../core/Vector3";
import Texture from "./textures/Texture";


var Uniforms = {

	clone: function( uniforms_src ) {

		var u, p, parameter, parameter_src, uniforms_dst = {};

		for ( u in uniforms_src ) {

			uniforms_dst[ u ] = {};

			for ( p in uniforms_src[ u ] ) {

				parameter_src = uniforms_src[ u ][ p ];

				if ( parameter_src instanceof Color ||
					 parameter_src instanceof Vector3 ||
					 parameter_src instanceof Texture ) {

					uniforms_dst[ u ][ p ] = parameter_src.clone();

				} else {

					uniforms_dst[ u ][ p ] = parameter_src;

				}

			}

		}

		return uniforms_dst;

	},
	
	merge: function( uniforms ) {
		
		var u, p, tmp, merged = {};
		
		for( u = 0; u < uniforms.length; u++ ) {
			
			tmp = this.clone( uniforms[ u ] );
			
			for ( p in tmp ) {
				
				merged[ p ] = tmp[ p ];
			
			}
			
		}
		
		return merged;
		
	}

};

export default Uniforms