import UVMapping from "../mappings/UVMapping";

const MultiplyOperation = 0;
const MixOperation = 1;

// Wrapping modes

const RepeatWrapping = 0;
const ClampToEdgeWrapping = 1;
const MirroredRepeatWrapping = 2;

// Filters

const NearestFilter = 3;
const NearestMipMapNearestFilter = 4;
const NearestMipMapLinearFilter = 5;
const LinearFilter = 6;
const LinearMipMapNearestFilter = 7;
const LinearMipMapLinearFilter = 8;

// Types

const ByteType = 9;
const UnsignedByteType = 10;
const ShortType = 11;
const UnsignedShortType = 12;
const IntType = 13;
const UnsignedIntType = 14;
const FloatType = 15;

// Formats

const AlphaFormat = 16;
const RGBFormat = 17;
const RGBAFormat = 18;
const LuminanceFormat = 19;
const LuminanceAlphaFormat = 20;


export default class Texture {

    constructor(image, mapping, wrap_s, wrap_t, mag_filter, min_filter) {
        this.image = image;

        this.mapping = mapping !== undefined ? mapping : new UVMapping();
    
        this.wrap_s = wrap_s !== undefined ? wrap_s : ClampToEdgeWrapping;
        this.wrap_t = wrap_t !== undefined ? wrap_t : ClampToEdgeWrapping;
    
        this.mag_filter = mag_filter !== undefined ? mag_filter : LinearFilter;
        this.min_filter = min_filter !== undefined ? min_filter : LinearMipMapLinearFilter;
    }

    clone() {
        return new Texture( this.image, this.mapping, this.wrap_s, this.wrap_t, this.mag_filter, this.min_filter )
    }

    toString() {

		return 'THREE.Texture (<br/>' +
			'image: ' + this.image + '<br/>' +
			'wrap_s: ' + this.wrap_s + '<br/>' +
			'wrap_t: ' + this.wrap_t + '<br/>' +
			'mag_filter: ' + this.mag_filter + '<br/>' +
			'min_filter: ' + this.min_filter + '<br/>' +
			')';
    }
}


export {
    MultiplyOperation,
    MixOperation,

    RepeatWrapping,
    ClampToEdgeWrapping,
    MirroredRepeatWrapping,

    NearestFilter,
    NearestMipMapNearestFilter,
    NearestMipMapLinearFilter,
    LinearFilter,
    LinearMipMapNearestFilter,
    LinearMipMapLinearFilter,

    ByteType,
    UnsignedByteType,
    ShortType,
    UnsignedShortType,
    IntType,
    UnsignedIntType,
    FloatType,

    // Formats

    AlphaFormat,
    RGBFormat,
    RGBAFormat,
    LuminanceFormat,
    LuminanceAlphaFormat

}