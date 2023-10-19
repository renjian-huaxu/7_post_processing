import Color from "../core/Color";
import { NormalBlending, SmoothShading } from "./Material";
import { MultiplyOperation } from "./textures/Texture";

const MeshPhongMaterialCounter = { value: 0 };

export default class MeshPhongMaterial {

    constructor(parameters) {

        this.id = MeshPhongMaterialCounter.value ++;

        this.color = new Color( 0xffffff );
        this.ambient = new Color( 0x050505 );
        this.specular = new Color( 0x111111 );
        this.shininess = 30;
    
        this.map = null;
        this.specular_map = null;
    
        this.light_map = null;
        
        this.env_map = null;
        this.combine = MultiplyOperation;
        this.reflectivity = 1;
        this.refraction_ratio = 0.98;
    
        this.fog = true;
    
        this.opacity = 1;
        this.shading = SmoothShading;
        this.blending = NormalBlending;
    
        this.wireframe = false;
        this.wireframe_linewidth = 1;
        this.wireframe_linecap = 'round';
        this.wireframe_linejoin = 'round';

        if ( parameters ) {

            if ( parameters.color !== undefined ) this.color = new Color( parameters.color );
            if ( parameters.ambient !== undefined ) this.ambient = new Color( parameters.ambient );
            if ( parameters.specular !== undefined ) this.specular = new Color( parameters.specular );
            if ( parameters.shininess !== undefined ) this.shininess = parameters.shininess;
    
            if ( parameters.light_map !== undefined ) this.light_map = parameters.light_map;
            
            if ( parameters.map !== undefined ) this.map = parameters.map;
            if ( parameters.specular_map !== undefined ) this.specular_map = parameters.specular_map;
    
            if ( parameters.env_map !== undefined ) this.env_map = parameters.env_map;
            if ( parameters.combine !== undefined ) this.combine = parameters.combine;
            if ( parameters.reflectivity !== undefined ) this.reflectivity  = parameters.reflectivity;
            if ( parameters.refraction_ratio !== undefined ) this.refraction_ratio  = parameters.refraction_ratio;
    
            if ( parameters.fog !== undefined ) this.fog  = parameters.fog;
    
            if ( parameters.opacity !== undefined ) this.opacity = parameters.opacity;
            if ( parameters.shading !== undefined ) this.shading = parameters.shading;
            if ( parameters.blending !== undefined ) this.blending = parameters.blending;
    
            if ( parameters.wireframe !== undefined ) this.wireframe = parameters.wireframe;
            if ( parameters.wireframe_linewidth !== undefined ) this.wireframe_linewidth = parameters.wireframe_linewidth;
            if ( parameters.wireframe_linecap !== undefined ) this.wireframe_linecap = parameters.wireframe_linecap;
            if ( parameters.wireframe_linejoin !== undefined ) this.wireframe_linejoin = parameters.wireframe_linejoin;
    
        }
    }

    toString() {

		return 'MeshPhongMaterial (<br/>' +
			'id: ' + this.id + '<br/>' +
			'color: ' + this.color + '<br/>' +
			'ambient: ' + this.ambient + '<br/>' +
			'specular: ' + this.specular + '<br/>' +
			'shininess: ' + this.shininess + '<br/>' +

			'map: ' + this.map + '<br/>' +
			'specular_map: ' + this.specular_map + '<br/>' +

			'env_map: ' + this.env_map + '<br/>' +
			'combine: ' + this.combine + '<br/>' +
			'reflectivity: ' + this.reflectivity + '<br/>' +
			'refraction_ratio: ' + this.refraction_ratio + '<br/>' +

			'opacity: ' + this.opacity + '<br/>' +
			'shading: ' + this.shading + '<br/>' +

			'wireframe: ' + this.wireframe + '<br/>' +
			'wireframe_linewidth: ' + this.wireframe_linewidth + '<br/>' +
			'wireframe_linecap: ' + this.wireframe_linecap +'<br/>' +
			'wireframe_linejoin: ' + this.wireframe_linejoin +'<br/>' +
			')';
    }

}