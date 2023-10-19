import { ClampToEdgeWrapping, LinearFilter, LinearMipMapLinearFilter, RGBFormat, UnsignedByteType } from "./textures/Texture";

export default class RenderTarget {

    constructor(width, height, options) {
        this.width = width;
        this.height = height;

        options = options || {};

        this.wrap_s = options.wrap_s !== undefined ? options.wrap_s : ClampToEdgeWrapping;
        this.wrap_t = options.wrap_t !== undefined ? options.wrap_t : ClampToEdgeWrapping;
    
        this.mag_filter = options.mag_filter !== undefined ? options.mag_filter : LinearFilter;
        this.min_filter = options.min_filter !== undefined ? options.min_filter : LinearMipMapLinearFilter;
    
        this.format = options.format !== undefined ? options.format : RGBFormat;
        this.type = options.type !== undefined ? options.type : UnsignedByteType;
    }

}