import Color from "../core/Color";
import Face3 from "../core/Face3";
import Face4 from "../core/Face4";
import Matrix4 from "../core/Matrix4";
import Vector4 from "../core/Vector4";
import AmbientLight from "../lights/AmbientLight";
import DirectionalLight from "../lights/DirectionalLight";
import PointLight from "../lights/PointLight";
import LineBasicMaterial from "../materials/LineBasicMaterial";
import { AdditiveBlending, BillboardBlending, NormalBlending, SmoothShading, SubtractiveBlending } from "../materials/Material";
import MeshBasicMaterial from "../materials/MeshBasicMaterial";
import MeshDepthMaterial from "../materials/MeshDepthMaterial";
import MeshFaceMaterial from "../materials/MeshFaceMaterial";
import MeshLambertMaterial from "../materials/MeshLambertMaterial";
import MeshNormalMaterial from "../materials/MeshNormalMaterial";
import MeshPhongMaterial from "../materials/MeshPhongMaterial";
import ParticleBasicMaterial from "../materials/ParticleBasicMaterial";
import Uniforms from "../materials/Uniforms";
import CubeRefractionMapping from "../materials/mappings/CubeRefractionMapping";
import { AlphaFormat, ByteType, ClampToEdgeWrapping, FloatType, IntType, LinearFilter, LinearMipMapLinearFilter, LinearMipMapNearestFilter, LuminanceAlphaFormat, LuminanceFormat, MirroredRepeatWrapping, MixOperation, NearestFilter, NearestMipMapLinearFilter, NearestMipMapNearestFilter, RGBAFormat, RGBFormat, RepeatWrapping, ShortType, UnsignedByteType, UnsignedShortType } from "../materials/textures/Texture";
import Line, { LineStrip } from "../objects/Line";
import Mesh from "../objects/Mesh";
import ParticleSystem from "../objects/ParticleSystem";
import Fog from "../scenes/Fog";
import FogExp2 from "../scenes/FogExp2";

export default class WebGLRenderer {

    _canvas = document.createElement('canvas')
    _gl
    _oldProgram = null
    _oldFramebuffer = null

    _modelViewMatrix = new Matrix4()
    _normalMatrix

    _viewMatrixArray = new Float32Array(16)
    _modelViewMatrixArray = new Float32Array(16)
    _projectionMatrixArray = new Float32Array(16)
    _normalMatrixArray = new Float32Array(9)
    _objectMatrixArray = new Float32Array(16)

    _projScreenMatrix = new Matrix4()
    _vector3 = new Vector4()

    antialias = true
    clearColor = new Color(0x000000)
    clearAlpha = 0


    domElement
    autoClear = true

    constructor(parameters) {
        if (parameters) {

            if (parameters.antialias !== undefined) this.antialias = parameters.antialias;
            if (parameters.clearColor !== undefined) this.clearColor.setHex(parameters.clearColor);
            if (parameters.clearAlpha !== undefined) this.clearAlpha = parameters.clearAlpha;

        }


        this.domElement = this._canvas
        this.initGL(this.antialias, this.clearColor, this.clearAlpha);
        this.context = this._gl

        this.lights = {

            ambient: [0, 0, 0],
            directional: { length: 0, colors: new Array(), positions: new Array() },
            point: { length: 0, colors: new Array(), positions: new Array() }

        }
    }

    initGL(antialias, clearColor, clearAlpha) {
        let _gl = this._gl

        try {

            _gl = this._canvas.getContext('experimental-webgl', { antialias: antialias });

        } catch (e) { console.log(e) }

        if (!_gl) {

            alert("WebGL not supported");
            throw "cannot create webgl context";

        }

        _gl.clearColor(0, 0, 0, 1);
        _gl.clearDepth(1);

        _gl.enable(_gl.DEPTH_TEST);
        _gl.depthFunc(_gl.LEQUAL);

        _gl.frontFace(_gl.CCW);
        _gl.cullFace(_gl.BACK);
        _gl.enable(_gl.CULL_FACE);

        _gl.enable(_gl.BLEND);
        _gl.blendFunc(_gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);
        _gl.clearColor(clearColor.r, clearColor.g, clearColor.b, clearAlpha);

        this._gl = _gl
    }


    setSize(width, height) {

        this._canvas.width = width;
        this._canvas.height = height;
        this._gl.viewport(0, 0, this._canvas.width, this._canvas.height);

    }

    render(scene, camera, renderTarget, clear) {
        const _gl = this._gl

        var object, buffer,
            lights = scene.lights,
            fog = scene.fog;

        camera.autoUpdateMatrix && camera.updateMatrix();

        this._viewMatrixArray.set(camera.matrix.flatten());
        this._projectionMatrixArray.set(camera.projectionMatrix.flatten());

        this.initWebGLObjects(scene, camera);

        this.setRenderTarget(renderTarget, clear !== undefined ? clear : true);

        if (this.autoClear) {

            this.clear();

        }

        // set matrices and faces

        scene.__webGLObjects.forEach(webGLObject => {

            object = webGLObject.object;
            buffer = webGLObject.buffer;

            if (object.visible) {

                object.autoUpdateMatrix && object.updateMatrix();

                if (object.doubleSided) {

                    _gl.disable(_gl.CULL_FACE);

                } else {

                    _gl.enable(_gl.CULL_FACE);

                    if (object.flipSided) {

                        _gl.frontFace(_gl.CW);

                    }
                    else {

                        _gl.frontFace(_gl.CCW);

                    }

                }

            }
        });

        // opaque pass

        scene.__webGLObjects.forEach(webGLObject => {
            object = webGLObject.object;
            buffer = webGLObject.buffer;

            if (object.visible) {

                object.autoUpdateMatrix && object.updateMatrix();

                this.setupMatrices(object, camera);
                this.renderPass(camera, lights, fog, object, buffer, NormalBlending, false);

            }
        })

        // opaque pass (immediate simulator)

        scene.__webGLObjectsImmediate.forEach(webGLObject => {
            object = webGLObject.object;

            if (object.visible) {

                this.setupMatrices(object, camera);
                this.renderPassImmediate(camera, lights, fog, object, NormalBlending, false);

            }
        });

        // transparent pass

        scene.__webGLObjects.forEach(webGLObject => {
            object = webGLObject.object;
            buffer = webGLObject.buffer;

            if (object.visible) {

                this.setupMatrices(object, camera);

                // opaque blended materials

                this.renderPass(camera, lights, fog, object, buffer, AdditiveBlending, false);
                this.renderPass(camera, lights, fog, object, buffer, SubtractiveBlending, false);

                // transparent blended materials

                this.renderPass(camera, lights, fog, object, buffer, AdditiveBlending, true);
                this.renderPass(camera, lights, fog, object, buffer, SubtractiveBlending, true);

                // transparent normal materials

                this.renderPass(camera, lights, fog, object, buffer, NormalBlending, true);

                // billboard materials

                this.renderPass(camera, lights, fog, object, buffer, BillboardBlending, false);

            }
        })

        // Generate mipmap if we're using any kind of mipmap filtering

        if (renderTarget && renderTarget.min_filter !== NearestFilter && renderTarget.min_filter !== LinearFilter) {

            this.updateRenderTargetMipmap(renderTarget);

        }

    }

    clear() {
        const _gl = this._gl

        _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

    };

    initWebGLObjects(scene, camera) {
        const _gl = this._gl

        function add_buffer(objmap, id, buffer, object) {

            if (objmap[id] == undefined) {

                scene.__webGLObjects.push({ buffer: buffer, object: object });
                objmap[id] = 1;

            }

        };

        function add_buffer_immediate(objmap, id, object) {

            if (objmap[id] == undefined) {

                scene.__webGLObjectsImmediate.push({ object: object });
                objmap[id] = 1;

            }

        };

        var g, geometry, geometryChunk, objmap;

        if (!scene.__webGLObjects) {

            scene.__webGLObjects = [];
            scene.__webGLObjectsMap = {};

            scene.__webGLObjectsImmediate = [];

        }

        scene.objects.forEach(object => {
            geometry = object.geometry
            if (scene.__webGLObjectsMap[object.id] == undefined) {

                scene.__webGLObjectsMap[object.id] = {};

            }

            objmap = scene.__webGLObjectsMap[object.id];

            if (object instanceof Mesh) {

                // create separate VBOs per geometry chunk

                for (g in geometry.geometryChunks) {

                    geometryChunk = geometry.geometryChunks[g];

                    // initialise VBO on the first access

                    if (!geometryChunk.__webGLVertexBuffer) {

                        this.createMeshBuffers(geometryChunk);
                        this.initMeshBuffers(geometryChunk, object);

                        geometry.__dirtyVertices = true;
                        geometry.__dirtyElements = true;
                        geometry.__dirtyUvs = true;
                        geometry.__dirtyNormals = true;
                        geometry.__dirtyTangents = true;

                    }

                    if (geometry.__dirtyVertices || geometry.__dirtyElements || geometry.__dirtyUvs) {

                        this.setMeshBuffers(geometryChunk, object, _gl.DYNAMIC_DRAW);


                    }

                    // create separate wrapper per each use of VBO

                    add_buffer(objmap, g, geometryChunk, object);

                }

                geometry.__dirtyVertices = false;
                geometry.__dirtyElements = false;
                geometry.__dirtyUvs = false;
                geometry.__dirtyNormals = false;
                geometry.__dirtyTangents = false;

            } else if (object instanceof Line) {


                if (!geometry.__webGLVertexBuffer) {

                    this.createLineBuffers(geometry);
                    this.initLineBuffers(geometry);

                    geometry.__dirtyVertices = true;
                    geometry.__dirtyElements = true;

                }

                if (geometry.__dirtyVertices) {

                    this.setLineBuffers(geometry, _gl.DYNAMIC_DRAW);

                }

                add_buffer(objmap, 0, geometry, object);

                geometry.__dirtyVertices = false;
                geometry.__dirtyElements = false;

            } else if (object instanceof ParticleSystem) {

                if (!geometry.__webGLVertexBuffer) {

                    this.createParticleBuffers(geometry);
                    this.initParticleBuffers(geometry);

                    geometry.__dirtyVertices = true;
                    geometry.__dirtyColors = true;
                    geometry.__dirtyElements = true;

                }

                if (geometry.__dirtyVertices || geometry.__dirtyColors || object.sortParticles) {

                    this.setParticleBuffers(geometry, _gl.DYNAMIC_DRAW, object, camera);

                }

                add_buffer(objmap, 0, geometry, object);

                geometry.__dirtyVertices = false;
                geometry.__dirtyColors = false;
                geometry.__dirtyElements = false;


            } else if (object instanceof MarchingCubes) {

                add_buffer_immediate(objmap, 0, object);

            }/*else if ( object instanceof Particle ) {

			}*/

        })

    }

    createMeshBuffers(geometryChunk) {
        const _gl = this._gl

        geometryChunk.__webGLVertexBuffer = _gl.createBuffer();
        geometryChunk.__webGLNormalBuffer = _gl.createBuffer();
        geometryChunk.__webGLTangentBuffer = _gl.createBuffer();
        geometryChunk.__webGLUVBuffer = _gl.createBuffer();
        geometryChunk.__webGLUV2Buffer = _gl.createBuffer();
        geometryChunk.__webGLFaceBuffer = _gl.createBuffer();
        geometryChunk.__webGLLineBuffer = _gl.createBuffer();
    }

    initMeshBuffers(geometryChunk, object) {
        var nvertices = 0, ntris = 0, nlines = 0,
            obj_faces = object.geometry.faces,
            chunk_faces = geometryChunk.faces;

        chunk_faces.forEach(fi => {
            const face = obj_faces[fi];

            if (face instanceof Face3) {

                nvertices += 3;
                ntris += 1;
                nlines += 3;

            } else if (face instanceof Face4) {

                nvertices += 4;
                ntris += 2;
                nlines += 4;

            }
        })

        // TODO: only create arrays for attributes existing in the object

        geometryChunk.__vertexArray = new Float32Array(nvertices * 3);
        geometryChunk.__normalArray = new Float32Array(nvertices * 3);
        geometryChunk.__tangentArray = new Float32Array(nvertices * 4);
        geometryChunk.__uvArray = new Float32Array(nvertices * 2);
        geometryChunk.__uv2Array = new Float32Array(nvertices * 2);

        geometryChunk.__faceArray = new Uint16Array(ntris * 3);
        geometryChunk.__lineArray = new Uint16Array(nlines * 2);

        geometryChunk.__needsSmoothNormals = this.bufferNeedsSmoothNormals(geometryChunk, object);

        geometryChunk.__webGLFaceCount = ntris * 3;
        geometryChunk.__webGLLineCount = nlines * 2;
    }

    bufferNeedsSmoothNormals(geometryChunk, object) {

        var needsSmoothNormals = false;

        object.materials.forEach(meshMaterial => {
            if (meshMaterial instanceof MeshFaceMaterial) {

                geometryChunk.materials.forEach(material => {
                    if (this.materialNeedsSmoothNormals(material)) {

                        needsSmoothNormals = true;

                    }
                });

            } else {

                if (this.materialNeedsSmoothNormals(meshMaterial)) {

                    needsSmoothNormals = true;

                }

            }
        })

        return needsSmoothNormals
    }

    materialNeedsSmoothNormals(material) {

        return material && material.shading != undefined && material.shading == SmoothShading;

    }

    supportsVertexTextures = function () {

        return this.maxVertexTextures() > 0;

    }

    maxVertexTextures() {
        const _gl = this._gl

        return _gl.getParameter(_gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);

    }

    setMeshBuffers(geometryChunk, object, hint) {
        const _gl = this._gl

        var face, vertexNormals, faceNormal, normal, uv, uv2,
            vn, uvi, uv2i,

            vertexIndex = 0,

            offset = 0,
            offset_uv = 0,
            offset_uv2 = 0,
            offset_face = 0,
            offset_normal = 0,
            offset_tangent = 0,
            offset_line = 0,

            vertexArray = geometryChunk.__vertexArray,
            uvArray = geometryChunk.__uvArray,
            uv2Array = geometryChunk.__uv2Array,
            normalArray = geometryChunk.__normalArray,
            tangentArray = geometryChunk.__tangentArray,

            faceArray = geometryChunk.__faceArray,
            lineArray = geometryChunk.__lineArray,

            needsSmoothNormals = geometryChunk.__needsSmoothNormals,

            geometry = object.geometry, // this is shared for all chunks

            dirtyVertices = geometry.__dirtyVertices,
            dirtyElements = geometry.__dirtyElements,
            dirtyUvs = geometry.__dirtyUvs,
            dirtyNormals = geometry.__dirtyNormals,
            dirtyTangents = geometry.__dirtyTangents,

            vertices = geometry.vertices,
            chunk_faces = geometryChunk.faces,
            obj_faces = geometry.faces,
            obj_uvs = geometry.uvs,
            obj_uvs2 = geometry.uvs2;

        chunk_faces.forEach(fi => {

            face = obj_faces[fi];
            uv = obj_uvs[fi];
            uv2 = obj_uvs2[fi];

            vertexNormals = face.vertexNormals;
            faceNormal = face.normal;

            if (face instanceof Face3) {

                if (dirtyVertices) {

                    const v1 = vertices[face.a].position;
                    const v2 = vertices[face.b].position;
                    const v3 = vertices[face.c].position;

                    vertexArray[offset] = v1.x;
                    vertexArray[offset + 1] = v1.y;
                    vertexArray[offset + 2] = v1.z;

                    vertexArray[offset + 3] = v2.x;
                    vertexArray[offset + 4] = v2.y;
                    vertexArray[offset + 5] = v2.z;

                    vertexArray[offset + 6] = v3.x;
                    vertexArray[offset + 7] = v3.y;
                    vertexArray[offset + 8] = v3.z;

                    offset += 9;

                }

                if (dirtyTangents && geometry.hasTangents) {

                    const t1 = vertices[face.a].tangent;
                    const t2 = vertices[face.b].tangent;
                    const t3 = vertices[face.c].tangent;

                    tangentArray[offset_tangent] = t1.x;
                    tangentArray[offset_tangent + 1] = t1.y;
                    tangentArray[offset_tangent + 2] = t1.z;
                    tangentArray[offset_tangent + 3] = t1.w;

                    tangentArray[offset_tangent + 4] = t2.x;
                    tangentArray[offset_tangent + 5] = t2.y;
                    tangentArray[offset_tangent + 6] = t2.z;
                    tangentArray[offset_tangent + 7] = t2.w;

                    tangentArray[offset_tangent + 8] = t3.x;
                    tangentArray[offset_tangent + 9] = t3.y;
                    tangentArray[offset_tangent + 10] = t3.z;
                    tangentArray[offset_tangent + 11] = t3.w;

                    offset_tangent += 12;

                }

                if (dirtyNormals) {

                    if (vertexNormals.length == 3 && needsSmoothNormals) {

                        for (let i = 0; i < 3; i++) {

                            vn = vertexNormals[i];

                            normalArray[offset_normal] = vn.x;
                            normalArray[offset_normal + 1] = vn.y;
                            normalArray[offset_normal + 2] = vn.z;

                            offset_normal += 3;

                        }

                    } else {

                        for (let i = 0; i < 3; i++) {

                            normalArray[offset_normal] = faceNormal.x;
                            normalArray[offset_normal + 1] = faceNormal.y;
                            normalArray[offset_normal + 2] = faceNormal.z;

                            offset_normal += 3;

                        }

                    }

                }

                if (dirtyUvs && uv) {

                    for (let i = 0; i < 3; i++) {

                        uvi = uv[i];

                        uvArray[offset_uv] = uvi.u;
                        uvArray[offset_uv + 1] = uvi.v;

                        offset_uv += 2;

                    }

                }

                if (dirtyUvs && uv2) {

                    for (let i = 0; i < 3; i++) {

                        uv2i = uv2[i];

                        uv2Array[offset_uv2] = uv2i.u;
                        uv2Array[offset_uv2 + 1] = uv2i.v;

                        offset_uv2 += 2;

                    }

                }

                if (dirtyElements) {

                    faceArray[offset_face] = vertexIndex;
                    faceArray[offset_face + 1] = vertexIndex + 1;
                    faceArray[offset_face + 2] = vertexIndex + 2;

                    offset_face += 3;

                    lineArray[offset_line] = vertexIndex;
                    lineArray[offset_line + 1] = vertexIndex + 1;

                    lineArray[offset_line + 2] = vertexIndex;
                    lineArray[offset_line + 3] = vertexIndex + 2;

                    lineArray[offset_line + 4] = vertexIndex + 1;
                    lineArray[offset_line + 5] = vertexIndex + 2;

                    offset_line += 6;

                    vertexIndex += 3;

                }


            } else if (face instanceof Face4) {

                if (dirtyVertices) {

                    const v1 = vertices[face.a].position;
                    const v2 = vertices[face.b].position;
                    const v3 = vertices[face.c].position;
                    const v4 = vertices[face.d].position;

                    vertexArray[offset] = v1.x;
                    vertexArray[offset + 1] = v1.y;
                    vertexArray[offset + 2] = v1.z;

                    vertexArray[offset + 3] = v2.x;
                    vertexArray[offset + 4] = v2.y;
                    vertexArray[offset + 5] = v2.z;

                    vertexArray[offset + 6] = v3.x;
                    vertexArray[offset + 7] = v3.y;
                    vertexArray[offset + 8] = v3.z;

                    vertexArray[offset + 9] = v4.x;
                    vertexArray[offset + 10] = v4.y;
                    vertexArray[offset + 11] = v4.z;

                    offset += 12;

                }

                if (dirtyTangents && geometry.hasTangents) {

                    const t1 = vertices[face.a].tangent;
                    const t2 = vertices[face.b].tangent;
                    const t3 = vertices[face.c].tangent;
                    const t4 = vertices[face.d].tangent;

                    tangentArray[offset_tangent] = t1.x;
                    tangentArray[offset_tangent + 1] = t1.y;
                    tangentArray[offset_tangent + 2] = t1.z;
                    tangentArray[offset_tangent + 3] = t1.w;

                    tangentArray[offset_tangent + 4] = t2.x;
                    tangentArray[offset_tangent + 5] = t2.y;
                    tangentArray[offset_tangent + 6] = t2.z;
                    tangentArray[offset_tangent + 7] = t2.w;

                    tangentArray[offset_tangent + 8] = t3.x;
                    tangentArray[offset_tangent + 9] = t3.y;
                    tangentArray[offset_tangent + 10] = t3.z;
                    tangentArray[offset_tangent + 11] = t3.w;

                    tangentArray[offset_tangent + 12] = t4.x;
                    tangentArray[offset_tangent + 13] = t4.y;
                    tangentArray[offset_tangent + 14] = t4.z;
                    tangentArray[offset_tangent + 15] = t4.w;

                    offset_tangent += 16;

                }

                if (dirtyNormals) {

                    if (vertexNormals.length == 4 && needsSmoothNormals) {

                        for (let i = 0; i < 4; i++) {

                            vn = vertexNormals[i];

                            normalArray[offset_normal] = vn.x;
                            normalArray[offset_normal + 1] = vn.y;
                            normalArray[offset_normal + 2] = vn.z;

                            offset_normal += 3;

                        }

                    } else {

                        for (let i = 0; i < 4; i++) {

                            normalArray[offset_normal] = faceNormal.x;
                            normalArray[offset_normal + 1] = faceNormal.y;
                            normalArray[offset_normal + 2] = faceNormal.z;

                            offset_normal += 3;

                        }

                    }

                }

                if (dirtyUvs && uv) {

                    for (let i = 0; i < 4; i++) {

                        uvi = uv[i];

                        uvArray[offset_uv] = uvi.u;
                        uvArray[offset_uv + 1] = uvi.v;

                        offset_uv += 2;

                    }

                }

                if (dirtyUvs && uv2) {

                    for (let i = 0; i < 4; i++) {

                        uv2i = uv2[i];

                        uv2Array[offset_uv2] = uv2i.u;
                        uv2Array[offset_uv2 + 1] = uv2i.v;

                        offset_uv2 += 2;

                    }

                }

                if (dirtyElements) {

                    faceArray[offset_face] = vertexIndex;
                    faceArray[offset_face + 1] = vertexIndex + 1;
                    faceArray[offset_face + 2] = vertexIndex + 2;

                    faceArray[offset_face + 3] = vertexIndex;
                    faceArray[offset_face + 4] = vertexIndex + 2;
                    faceArray[offset_face + 5] = vertexIndex + 3;

                    offset_face += 6;

                    lineArray[offset_line] = vertexIndex;
                    lineArray[offset_line + 1] = vertexIndex + 1;

                    lineArray[offset_line + 2] = vertexIndex;
                    lineArray[offset_line + 3] = vertexIndex + 3;

                    lineArray[offset_line + 4] = vertexIndex + 1;
                    lineArray[offset_line + 5] = vertexIndex + 2;

                    lineArray[offset_line + 6] = vertexIndex + 2;
                    lineArray[offset_line + 7] = vertexIndex + 3;

                    offset_line += 8;

                    vertexIndex += 4;

                }

            }
        });

        if (dirtyVertices) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLVertexBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, vertexArray, hint);

        }

        if (dirtyNormals) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLNormalBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, normalArray, hint);

        }

        if (dirtyTangents && geometry.hasTangents) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLTangentBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, tangentArray, hint);

        }

        if (dirtyUvs && offset_uv > 0) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLUVBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, uvArray, hint);

        }

        if (dirtyUvs && offset_uv2 > 0) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLUV2Buffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, uv2Array, hint);

        }

        if (dirtyElements) {

            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometryChunk.__webGLFaceBuffer);
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, faceArray, hint);

            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometryChunk.__webGLLineBuffer);
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, lineArray, hint);

        }
    }

    createLineBuffers(geometry) {
        const _gl = this._gl

        geometry.__webGLVertexBuffer = _gl.createBuffer();
        geometry.__webGLLineBuffer = _gl.createBuffer();
    }

    initLineBuffers(geometry) {
        var nvertices = geometry.vertices.length;

        geometry.__vertexArray = new Float32Array(nvertices * 3);
        geometry.__lineArray = new Uint16Array(nvertices);

        geometry.__webGLLineCount = nvertices;
    }

    setLineBuffers(geometry, hint) {
        const _gl = this._gl

        var offset,
            vertices = geometry.vertices,
            vertexArray = geometry.__vertexArray,
            lineArray = geometry.__lineArray,

            dirtyVertices = geometry.__dirtyVertices,
            dirtyElements = geometry.__dirtyElements;

        if (dirtyVertices) {

            vertices.forEach((vertex, index) => {
                const vPosition = vertex.position;

                offset = index * 3;

                vertexArray[offset] = vPosition.x;
                vertexArray[offset + 1] = vPosition.y;
                vertexArray[offset + 2] = vPosition.z;
            });

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometry.__webGLVertexBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, vertexArray, hint);

        }

        // yeah, this is silly as order of element indices is currently fixed
        // though this could change if some use case arises

        if (dirtyElements) {

            vertices.forEach((_, index) => {
                lineArray[index] = index;          
            });

            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometry.__webGLLineBuffer);
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, lineArray, hint);

        }

    }

    createParticleBuffers(geometry) {
        const _gl = this._gl

        geometry.__webGLVertexBuffer = _gl.createBuffer();
        geometry.__webGLParticleBuffer = _gl.createBuffer();
        geometry.__webGLColorBuffer = _gl.createBuffer();
    }

    initParticleBuffers(geometry) {
        var nvertices = geometry.vertices.length;

        geometry.__vertexArray = new Float32Array(nvertices * 3);
        geometry.__colorArray = new Float32Array(nvertices * 3);
        geometry.__particleArray = new Uint16Array(nvertices);

        geometry.__sortArray = [];

        geometry.__webGLParticleCount = nvertices;
    }

    setParticleBuffers(geometry, hint, object, camera) {
        const _gl = this._gl

        var v, c, vertex, offset,
            vertices = geometry.vertices,
            vl = vertices.length,

            colors = geometry.colors,
            cl = colors.length,

            vertexArray = geometry.__vertexArray,
            particleArray = geometry.__particleArray,
            colorArray = geometry.__colorArray,

            sortArray = geometry.__sortArray,

            dirtyVertices = geometry.__dirtyVertices,
            dirtyElements = geometry.__dirtyElements,
            dirtyColors = geometry.__dirtyColors;

        if (object.sortParticles) {

            this._projScreenMatrix.multiply(camera.projectionMatrix, camera.matrix);
            this._projScreenMatrix.multiplySelf(object.matrix);

            for (v = 0; v < vl; v++) {

                vertex = vertices[v].position;

                this._vector3.copy(vertex);
                this._projScreenMatrix.multiplyVector3(this._vector3);

                sortArray[v] = [this._vector3.z, v];

            }

            sortArray.sort(function (a, b) { return b[0] - a[0]; });

            for (v = 0; v < vl; v++) {

                vertex = vertices[sortArray[v][1]].position;

                offset = v * 3;

                vertexArray[offset] = vertex.x;
                vertexArray[offset + 1] = vertex.y;
                vertexArray[offset + 2] = vertex.z;
            }

            for (c = 0; c < cl; c++) {

                offset = c * 3;

                const color = colors[sortArray[c][1]];

                colorArray[offset] = color.r;
                colorArray[offset + 1] = color.g;
                colorArray[offset + 2] = color.b;

            }


        } else {

            if (dirtyVertices) {

                for (v = 0; v < vl; v++) {

                    vertex = vertices[v].position;

                    offset = v * 3;

                    vertexArray[offset] = vertex.x;
                    vertexArray[offset + 1] = vertex.y;
                    vertexArray[offset + 2] = vertex.z;

                }

            }

            if (dirtyColors) {

                for (c = 0; c < cl; c++) {

                    const color = colors[c];

                    offset = c * 3;

                    colorArray[offset] = color.r;
                    colorArray[offset + 1] = color.g;
                    colorArray[offset + 2] = color.b;

                }

            }

        }


        // yeah, this is silly as order of element indices is currently fixed
        // though this could change if some use case arises
        // (like depth-sorting of semi-opaque particles)

        if (dirtyElements) {

            for (v = 0; v < vl; v++) {

                particleArray[v] = v;

            }

            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometry.__webGLParticleBuffer);
            _gl.bufferData(_gl.ELEMENT_ARRAY_BUFFER, particleArray, hint);

        }

        if (dirtyVertices || object.sortParticles) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometry.__webGLVertexBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, vertexArray, hint);

        }

        if (dirtyColors || object.sortParticles) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometry.__webGLColorBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, colorArray, hint);

        }
    }

    setRenderTarget(renderTexture, clear) {
        const _gl = this._gl
        const _canvas = this._canvas

        if (renderTexture && !renderTexture.__webGLFramebuffer) {

            renderTexture.__webGLFramebuffer = _gl.createFramebuffer();
            renderTexture.__webGLRenderbuffer = _gl.createRenderbuffer();
            renderTexture.__webGLTexture = _gl.createTexture();

            // Setup renderbuffer

            _gl.bindRenderbuffer(_gl.RENDERBUFFER, renderTexture.__webGLRenderbuffer);
            _gl.renderbufferStorage(_gl.RENDERBUFFER, _gl.DEPTH_COMPONENT16, renderTexture.width, renderTexture.height);

            // Setup texture

            _gl.bindTexture(_gl.TEXTURE_2D, renderTexture.__webGLTexture);
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, this.paramThreeToGL(renderTexture.wrap_s));
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, this.paramThreeToGL(renderTexture.wrap_t));
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, this.paramThreeToGL(renderTexture.mag_filter));
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, this.paramThreeToGL(renderTexture.min_filter));
            _gl.texImage2D(_gl.TEXTURE_2D, 0, this.paramThreeToGL(renderTexture.format), renderTexture.width, renderTexture.height, 0, this.paramThreeToGL(renderTexture.format), this.paramThreeToGL(renderTexture.type), null);

            // Setup framebuffer

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, renderTexture.__webGLFramebuffer);
            _gl.framebufferTexture2D(_gl.FRAMEBUFFER, _gl.COLOR_ATTACHMENT0, _gl.TEXTURE_2D, renderTexture.__webGLTexture, 0);
            _gl.framebufferRenderbuffer(_gl.FRAMEBUFFER, _gl.DEPTH_ATTACHMENT, _gl.RENDERBUFFER, renderTexture.__webGLRenderbuffer);

            // Release everything

            _gl.bindTexture(_gl.TEXTURE_2D, null);
            _gl.bindRenderbuffer(_gl.RENDERBUFFER, null);
            _gl.bindFramebuffer(_gl.FRAMEBUFFER, null);

        }

        var framebuffer, width, height;

        if (renderTexture) {

            framebuffer = renderTexture.__webGLFramebuffer;
            width = renderTexture.width;
            height = renderTexture.height;

        } else {

            framebuffer = null;
            width = _canvas.width;
            height = _canvas.height;

        }

        if (framebuffer != this._oldFramebuffer) {

            _gl.bindFramebuffer(_gl.FRAMEBUFFER, framebuffer);
            _gl.viewport(0, 0, width, height);

            if (clear) {

                _gl.clear(_gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT);

            }

            this._oldFramebuffer = framebuffer;

        }
    }

    setupMatrices(object, camera) {

        this._modelViewMatrix.multiply(camera.matrix, object.matrix);
        this._modelViewMatrixArray.set(this._modelViewMatrix.flatten());

        this._normalMatrix = Matrix4.makeInvert3x3(this._modelViewMatrix).transpose();
        this._normalMatrixArray.set(this._normalMatrix.m);

        this._objectMatrixArray.set(object.matrix.flatten());

    };

    renderPass(camera, lights, fog, object, geometryChunk, blending, transparent) {

        object.materials.forEach(meshMaterial => {

            if (meshMaterial instanceof MeshFaceMaterial) {

                geometryChunk.materials.forEach(material => {
                    if (material && material.blending == blending && (material.opacity < 1.0 == transparent)) {

                        this.setBlending(material.blending);
                        this.renderBuffer(camera, lights, fog, material, geometryChunk, object);

                    }
                })

            } else {

                const material = meshMaterial;
                if (material && material.blending == blending && (material.opacity < 1.0 == transparent)) {

                    this.setBlending(material.blending);
                    this.renderBuffer(camera, lights, fog, material, geometryChunk, object);

                }

            }
        })
    }

    setBlending(blending) {
        const _gl = this._gl

        switch (blending) {

            case AdditiveBlending:

                _gl.blendEquation(_gl.FUNC_ADD);
                _gl.blendFunc(_gl.ONE, _gl.ONE);

                break;

            case SubtractiveBlending:

                //_gl.blendEquation( _gl.FUNC_SUBTRACT );
                _gl.blendFunc(_gl.DST_COLOR, _gl.ZERO);

                break;

            case BillboardBlending:

                _gl.blendEquation(_gl.FUNC_ADD);
                _gl.blendFunc(_gl.SRC_ALPHA, _gl.ONE_MINUS_SRC_ALPHA);

                break;

            default:

                _gl.blendEquation(_gl.FUNC_ADD);
                _gl.blendFunc(_gl.ONE, _gl.ONE_MINUS_SRC_ALPHA);

                break;

        }

    }

    setFaceCulling(cullFace, frontFace) {
        const _gl = this._gl

        if (cullFace) {

            if (!frontFace || frontFace == "ccw") {

                _gl.frontFace(_gl.CCW);

            } else {

                _gl.frontFace(_gl.CW);

            }

            if (cullFace == "back") {

                _gl.cullFace(_gl.BACK);

            } else if (cullFace == "front") {

                _gl.cullFace(_gl.FRONT);

            } else {

                _gl.cullFace(_gl.FRONT_AND_BACK);

            }

            _gl.enable(_gl.CULL_FACE);

        } else {

            _gl.disable(_gl.CULL_FACE);

        }

    }

    renderBuffer(camera, lights, fog, material, geometryChunk, object) {
        const _gl = this._gl

        var program, attributes, linewidth, primitives;

        program = this.setProgram(camera, lights, fog, material, object);

        attributes = program.attributes;

        // vertices

        _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLVertexBuffer);
        _gl.vertexAttribPointer(attributes.position, 3, _gl.FLOAT, false, 0, 0);
        _gl.enableVertexAttribArray(attributes.position);

        // colors

        if (attributes.color >= 0) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLColorBuffer);
            _gl.vertexAttribPointer(attributes.color, 3, _gl.FLOAT, false, 0, 0);
            _gl.enableVertexAttribArray(attributes.color);

        }

        // normals

        if (attributes.normal >= 0) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLNormalBuffer);
            _gl.vertexAttribPointer(attributes.normal, 3, _gl.FLOAT, false, 0, 0);
            _gl.enableVertexAttribArray(attributes.normal);

        }

        // tangents

        if (attributes.tangent >= 0) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLTangentBuffer);
            _gl.vertexAttribPointer(attributes.tangent, 4, _gl.FLOAT, false, 0, 0);
            _gl.enableVertexAttribArray(attributes.tangent);

        }

        // uvs

        if (attributes.uv >= 0) {

            if (geometryChunk.__webGLUVBuffer) {

                _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLUVBuffer);
                _gl.vertexAttribPointer(attributes.uv, 2, _gl.FLOAT, false, 0, 0);

                _gl.enableVertexAttribArray(attributes.uv);

            } else {

                _gl.disableVertexAttribArray(attributes.uv);

            }

        }

        if (attributes.uv2 >= 0) {

            if (geometryChunk.__webGLUV2Buffer) {

                _gl.bindBuffer(_gl.ARRAY_BUFFER, geometryChunk.__webGLUV2Buffer);
                _gl.vertexAttribPointer(attributes.uv2, 2, _gl.FLOAT, false, 0, 0);

                _gl.enableVertexAttribArray(attributes.uv2);

            } else {

                _gl.disableVertexAttribArray(attributes.uv2);

            }

        }

        // render lines

        if (material.wireframe || material instanceof LineBasicMaterial) {

            linewidth = material.wireframe_linewidth !== undefined ? material.wireframe_linewidth :
                material.linewidth !== undefined ? material.linewidth : 1;

            primitives = material instanceof LineBasicMaterial && object.type == LineStrip ? _gl.LINE_STRIP : _gl.LINES;

            _gl.lineWidth(linewidth);
            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometryChunk.__webGLLineBuffer);
            _gl.drawElements(primitives, geometryChunk.__webGLLineCount, _gl.UNSIGNED_SHORT, 0);

            // render particles

        } else if (material instanceof ParticleBasicMaterial) {

            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometryChunk.__webGLParticleBuffer);
            _gl.drawElements(_gl.POINTS, geometryChunk.__webGLParticleCount, _gl.UNSIGNED_SHORT, 0);

            // render triangles

        } else {

            _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, geometryChunk.__webGLFaceBuffer);
            _gl.drawElements(_gl.TRIANGLES, geometryChunk.__webGLFaceCount, _gl.UNSIGNED_SHORT, 0);

        }

    }

    setProgram(camera, lights, fog, material, object) {
        const _gl = this._gl

        this.initMaterial(material, lights, fog);

        var program = material.program;

        if (program != this._oldProgram) {

            _gl.useProgram(program);
            this._oldProgram = program;

        }

        this.loadCamera(program, camera);
        this.loadMatrices(program);

        if (material instanceof MeshPhongMaterial ||
            material instanceof MeshLambertMaterial) {

            this.setupLights(program, lights);
            this.refreshLights(material, this.lights);

        }

        if (material instanceof MeshBasicMaterial ||
            material instanceof MeshLambertMaterial ||
            material instanceof MeshPhongMaterial) {

            this.refreshUniformsCommon(material, fog);

        }

        if (material instanceof LineBasicMaterial) {

            this.refreshUniformsLine(material, fog);

        }

        if (material instanceof ParticleBasicMaterial) {

            this.refreshUniformsParticle(material, fog);

        }

        if (material instanceof MeshPhongMaterial) {

            this.refreshUniformsPhong(material);

        }

        if (material instanceof MeshDepthMaterial) {

            material.uniforms.mNear.value = camera.near;
            material.uniforms.mFar.value = camera.far;

        }

        this.setUniforms(program, material.uniforms);

        return program;

    }

    initMaterial(material, lights, fog) {

        if (!material.program) {

            var u, identifiers, parameters, maxLightCount;

            if (material instanceof MeshDepthMaterial) {

                this.setMaterialShaders(material, ShaderLib['depth']);

            } else if (material instanceof MeshNormalMaterial) {

                this.setMaterialShaders(material, ShaderLib['normal']);

            } else if (material instanceof MeshBasicMaterial) {

                this.setMaterialShaders(material, ShaderLib['basic']);

            } else if (material instanceof MeshLambertMaterial) {

                this.setMaterialShaders(material, ShaderLib['lambert']);

            } else if (material instanceof MeshPhongMaterial) {

                this.setMaterialShaders(material, ShaderLib['phong']);

            } else if (material instanceof LineBasicMaterial) {

                this.setMaterialShaders(material, ShaderLib['basic']);

            } else if (material instanceof ParticleBasicMaterial) {

                this.setMaterialShaders(material, ShaderLib['particle_basic']);

            }

            // heuristics to create shader parameters according to lights in the scene
            // (not to blow over maxLights budget)

            maxLightCount = this.allocateLights(lights, 4);

            parameters = {
                fog: fog, map: material.map, env_map: material.env_map, light_map: material.light_map, vertex_colors: material.vertex_colors,
                maxDirLights: maxLightCount.directional, maxPointLights: maxLightCount.point
            };
            material.program = this.buildProgram(material.fragment_shader, material.vertex_shader, parameters);

            identifiers = ['viewMatrix', 'modelViewMatrix', 'projectionMatrix', 'normalMatrix', 'objectMatrix', 'cameraPosition'];
            for (u in material.uniforms) {

                identifiers.push(u);

            }

            this.cacheUniformLocations(material.program, identifiers);
            this.cacheAttributeLocations(material.program, ["position", "normal", "uv", "uv2", "tangent", "color"]);

        }

    }

    setMaterialShaders(material, shaders) {

        material.fragment_shader = shaders.fragment_shader;
        material.vertex_shader = shaders.vertex_shader;
        material.uniforms = Uniforms.clone(shaders.uniforms);

    }

    allocateLights(lights, maxLights) {

        var dirLights, pointLights, maxDirLights, maxPointLights;
        dirLights = pointLights = maxDirLights = maxPointLights = 0;

        lights.forEach(light => {
            if (light instanceof DirectionalLight) dirLights++;
            if (light instanceof PointLight) pointLights++;
        })

        if ((pointLights + dirLights) <= maxLights) {

            maxDirLights = dirLights;
            maxPointLights = pointLights;

        } else {

            maxDirLights = Math.ceil(maxLights * dirLights / (pointLights + dirLights));
            maxPointLights = maxLights - maxDirLights;

        }

        return { 'directional': maxDirLights, 'point': maxPointLights };

    }

    buildProgram(fragment_shader, vertex_shader, parameters) {
        const _gl = this._gl

        var program = _gl.createProgram(),

            prefix_fragment = [
                "#ifdef GL_ES",
                "precision highp float;",
                "#endif",

                "#define MAX_DIR_LIGHTS " + parameters.maxDirLights,
                "#define MAX_POINT_LIGHTS " + parameters.maxPointLights,

                parameters.fog ? "#define USE_FOG" : "",
                parameters.fog instanceof FogExp2 ? "#define FOG_EXP2" : "",

                parameters.map ? "#define USE_MAP" : "",
                parameters.env_map ? "#define USE_ENVMAP" : "",
                parameters.light_map ? "#define USE_LIGHTMAP" : "",
                parameters.vertex_colors ? "#define USE_COLOR" : "",

                "uniform mat4 viewMatrix;",
                "uniform vec3 cameraPosition;",
                ""
            ].join("\n"),

            prefix_vertex = [
                this.maxVertexTextures() > 0 ? "#define VERTEX_TEXTURES" : "",

                "#define MAX_DIR_LIGHTS " + parameters.maxDirLights,
                "#define MAX_POINT_LIGHTS " + parameters.maxPointLights,

                parameters.map ? "#define USE_MAP" : "",
                parameters.env_map ? "#define USE_ENVMAP" : "",
                parameters.light_map ? "#define USE_LIGHTMAP" : "",
                parameters.vertex_colors ? "#define USE_COLOR" : "",

                "uniform mat4 objectMatrix;",
                "uniform mat4 modelViewMatrix;",
                "uniform mat4 projectionMatrix;",
                "uniform mat4 viewMatrix;",
                "uniform mat3 normalMatrix;",
                "uniform vec3 cameraPosition;",
                "attribute vec3 position;",
                "attribute vec3 normal;",
                "attribute vec3 color;",
                "attribute vec2 uv;",
                "attribute vec2 uv2;",
                ""
            ].join("\n");

        _gl.attachShader(program, this.getShader("fragment", prefix_fragment + fragment_shader));
        _gl.attachShader(program, this.getShader("vertex", prefix_vertex + vertex_shader));

        _gl.linkProgram(program);

        if (!_gl.getProgramParameter(program, _gl.LINK_STATUS)) {

            alert("Could not initialise shaders\n" +
                "VALIDATE_STATUS: " + _gl.getProgramParameter(program, _gl.VALIDATE_STATUS) + ", gl error [" + _gl.getError() + "]");

            //console.log( prefix_fragment + fragment_shader );
            //console.log( prefix_vertex + vertex_shader );

        }

        //console.log( prefix_fragment + fragment_shader );
        //console.log( prefix_vertex + vertex_shader );

        program.uniforms = {};
        program.attributes = {};

        return program;

    }

    maxVertexTextures() {
        const _gl = this._gl

        return _gl.getParameter(_gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);

    }

    getShader(type, string) {
        const _gl = this._gl

        var shader;

        if (type == "fragment") {

            shader = _gl.createShader(_gl.FRAGMENT_SHADER);

        } else if (type == "vertex") {

            shader = _gl.createShader(_gl.VERTEX_SHADER);

        }

        _gl.shaderSource(shader, string);
        _gl.compileShader(shader);

        if (!_gl.getShaderParameter(shader, _gl.COMPILE_STATUS)) {

            alert(_gl.getShaderInfoLog(shader));
            return null;

        }

        return shader;

    }

    cacheUniformLocations(program, identifiers) {

        identifiers.forEach(id => {
            program.uniforms[id] = this._gl.getUniformLocation(program, id);
        });

    }

    cacheAttributeLocations(program, identifiers) {
        identifiers.forEach(id => {
            program.attributes[id] = this._gl.getAttribLocation(program, id)
        })

    }


    renderBufferImmediate(object, program) {
        const _gl = this._gl

        if (!object.__webGLVertexBuffer) object.__webGLVertexBuffer = _gl.createBuffer();
        if (!object.__webGLNormalBuffer) object.__webGLNormalBuffer = _gl.createBuffer();

        if (object.hasPos) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, object.__webGLVertexBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, object.positionArray, _gl.DYNAMIC_DRAW);
            _gl.enableVertexAttribArray(program.attributes.position);
            _gl.vertexAttribPointer(program.attributes.position, 3, _gl.FLOAT, false, 0, 0);

        }

        if (object.hasNormal) {

            _gl.bindBuffer(_gl.ARRAY_BUFFER, object.__webGLNormalBuffer);
            _gl.bufferData(_gl.ARRAY_BUFFER, object.normalArray, _gl.DYNAMIC_DRAW);
            _gl.enableVertexAttribArray(program.attributes.normal);
            _gl.vertexAttribPointer(program.attributes.normal, 3, _gl.FLOAT, false, 0, 0);

        }

        _gl.drawArrays(_gl.TRIANGLES, 0, object.count);

        object.count = 0;

    };

    renderPassImmediate(camera, lights, fog, object, blending, transparent) {

        object.materials.forEach(material => {
            if (material && material.blending == blending && (material.opacity < 1.0 == transparent)) {

                this.setBlending(material.blending);
                const program = this.setProgram(camera, lights, fog, material, object);

                object.render(function (object) {
                    this.renderBufferImmediate(object, program);
                });

            }
        });
    }

    updateRenderTargetMipmap(renderTarget) {
        const _gl = this._gl

        _gl.bindTexture(_gl.TEXTURE_2D, renderTarget.__webGLTexture);
        _gl.generateMipmap(_gl.TEXTURE_2D);
        _gl.bindTexture(_gl.TEXTURE_2D, null);

    }

    paramThreeToGL(p) {
        const _gl = this._gl

        switch (p) {

            case RepeatWrapping: return _gl.REPEAT; break;
            case ClampToEdgeWrapping: return _gl.CLAMP_TO_EDGE; break;
            case MirroredRepeatWrapping: return _gl.MIRRORED_REPEAT; break;

            case NearestFilter: return _gl.NEAREST; break;
            case NearestMipMapNearestFilter: return _gl.NEAREST_MIPMAP_NEAREST; break;
            case NearestMipMapLinearFilter: return _gl.NEAREST_MIPMAP_LINEAR; break;

            case LinearFilter: return _gl.LINEAR; break;
            case LinearMipMapNearestFilter: return _gl.LINEAR_MIPMAP_NEAREST; break;
            case LinearMipMapLinearFilter: return _gl.LINEAR_MIPMAP_LINEAR; break;

            case ByteType: return _gl.BYTE; break;
            case UnsignedByteType: return _gl.UNSIGNED_BYTE; break;
            case ShortType: return _gl.SHORT; break;
            case UnsignedShortType: return _gl.UNSIGNED_SHORT; break;
            case IntType: return _gl.INT; break;
            case UnsignedShortType: return _gl.UNSIGNED_INT; break;
            case FloatType: return _gl.FLOAT; break;

            case AlphaFormat: return _gl.ALPHA; break;
            case RGBFormat: return _gl.RGB; break;
            case RGBAFormat: return _gl.RGBA; break;
            case LuminanceFormat: return _gl.LUMINANCE; break;
            case LuminanceAlphaFormat: return _gl.LUMINANCE_ALPHA; break;

        }

        return 0;

    }

    loadCamera(program, camera) {

        this._gl.uniform3f(program.uniforms.cameraPosition, camera.position.x, camera.position.y, camera.position.z);

    }

    loadMatrices(program) {
        const _gl = this._gl

        _gl.uniformMatrix4fv(program.uniforms.viewMatrix, false, this._viewMatrixArray);
        _gl.uniformMatrix4fv(program.uniforms.modelViewMatrix, false, this._modelViewMatrixArray);
        _gl.uniformMatrix4fv(program.uniforms.projectionMatrix, false, this._projectionMatrixArray);
        _gl.uniformMatrix3fv(program.uniforms.normalMatrix, false, this._normalMatrixArray);
        _gl.uniformMatrix4fv(program.uniforms.objectMatrix, false, this._objectMatrixArray);

    }

    setupLights(program, lights) {

        var r = 0, g = 0, b = 0,
            color, position, intensity,

            zlights = this.lights,

            dcolors = zlights.directional.colors,
            dpositions = zlights.directional.positions,

            pcolors = zlights.point.colors,
            ppositions = zlights.point.positions,

            dlength = 0,
            plength = 0;

        lights.forEach(light => {
            color = light.color;
            position = light.position;
            intensity = light.intensity;

            if (light instanceof AmbientLight) {

                r += color.r;
                g += color.g;
                b += color.b;

            } else if (light instanceof DirectionalLight) {

                dcolors[dlength * 3] = color.r * intensity;
                dcolors[dlength * 3 + 1] = color.g * intensity;
                dcolors[dlength * 3 + 2] = color.b * intensity;

                dpositions[dlength * 3] = position.x;
                dpositions[dlength * 3 + 1] = position.y;
                dpositions[dlength * 3 + 2] = position.z;

                dlength += 1;

            } else if (light instanceof PointLight) {

                pcolors[plength * 3] = color.r * intensity;
                pcolors[plength * 3 + 1] = color.g * intensity;
                pcolors[plength * 3 + 2] = color.b * intensity;

                ppositions[plength * 3] = position.x;
                ppositions[plength * 3 + 1] = position.y;
                ppositions[plength * 3 + 2] = position.z;

                plength += 1;

            }
        })

        zlights.point.length = plength;
        zlights.directional.length = dlength;

        zlights.ambient[0] = r;
        zlights.ambient[1] = g;
        zlights.ambient[2] = b;

    }

    refreshLights(material, lights) {

        material.uniforms.enableLighting.value = lights.directional.length + lights.point.length;
        material.uniforms.ambientLightColor.value = lights.ambient;
        material.uniforms.directionalLightColor.value = lights.directional.colors;
        material.uniforms.directionalLightDirection.value = lights.directional.positions;
        material.uniforms.pointLightColor.value = lights.point.colors;
        material.uniforms.pointLightPosition.value = lights.point.positions;

    }

    refreshUniformsCommon(material, fog) {

        // premultiply alpha
        material.uniforms.diffuse.value.setRGB(material.color.r * material.opacity, material.color.g * material.opacity, material.color.b * material.opacity);

        // pure color
        //material.uniforms.color.value.setHex( material.color.hex );

        material.uniforms.opacity.value = material.opacity;
        material.uniforms.map.texture = material.map;

        material.uniforms.light_map.texture = material.light_map;

        material.uniforms.env_map.texture = material.env_map;
        material.uniforms.reflectivity.value = material.reflectivity;
        material.uniforms.refraction_ratio.value = material.refraction_ratio;
        material.uniforms.combine.value = material.combine;
        material.uniforms.useRefract.value = material.env_map && material.env_map.mapping instanceof CubeRefractionMapping;

        if (fog) {

            material.uniforms.fogColor.value.setHex(fog.color.hex);

            if (fog instanceof Fog) {

                material.uniforms.fogNear.value = fog.near;
                material.uniforms.fogFar.value = fog.far;

            } else if (fog instanceof FogExp2) {

                material.uniforms.fogDensity.value = fog.density;

            }

        }

    }

    refreshUniformsLine(material, fog) {

        material.uniforms.diffuse.value.setRGB(material.color.r * material.opacity, material.color.g * material.opacity, material.color.b * material.opacity);
        material.uniforms.opacity.value = material.opacity;

        if (fog) {

            material.uniforms.fogColor.value.setHex(fog.color.hex);

            if (fog instanceof Fog) {

                material.uniforms.fogNear.value = fog.near;
                material.uniforms.fogFar.value = fog.far;

            } else if (fog instanceof FogExp2) {

                material.uniforms.fogDensity.value = fog.density;

            }

        }

    }

    refreshUniformsParticle(material, fog) {

        material.uniforms.psColor.value.setRGB(material.color.r * material.opacity, material.color.g * material.opacity, material.color.b * material.opacity);
        material.uniforms.opacity.value = material.opacity;
        material.uniforms.size.value = material.size;
        material.uniforms.map.texture = material.map;

        if (fog) {

            material.uniforms.fogColor.value.setHex(fog.color.hex);

            if (fog instanceof Fog) {

                material.uniforms.fogNear.value = fog.near;
                material.uniforms.fogFar.value = fog.far;

            } else if (fog instanceof FogExp2) {

                material.uniforms.fogDensity.value = fog.density;

            }

        }

    }

    refreshUniformsPhong(material) {

        //material.uniforms.ambient.value.setHex( material.ambient.hex );
        //material.uniforms.specular.value.setHex( material.specular.hex );
        material.uniforms.ambient.value.setRGB(material.ambient.r, material.ambient.g, material.ambient.b);
        material.uniforms.specular.value.setRGB(material.specular.r, material.specular.g, material.specular.b);
        material.uniforms.shininess.value = material.shininess;

    }

    setUniforms(program, uniforms) {
        const _gl = this._gl

        var u, uniform, value, type, location, texture;

        for (u in uniforms) {

            location = program.uniforms[u];
            if (!location) continue;

            uniform = uniforms[u];

            type = uniform.type;
            value = uniform.value;

            if (type == "i") {

                _gl.uniform1i(location, value);

            } else if (type == "f") {

                _gl.uniform1f(location, value);

            } else if (type == "fv1") {

                _gl.uniform1fv(location, value);

            } else if (type == "fv") {

                _gl.uniform3fv(location, value);

            } else if (type == "v2") {

                _gl.uniform2f(location, value.x, value.y);

            } else if (type == "v3") {

                _gl.uniform3f(location, value.x, value.y, value.z);

            } else if (type == "c") {

                _gl.uniform3f(location, value.r, value.g, value.b);

            } else if (type == "t") {

                _gl.uniform1i(location, value);

                texture = uniform.texture;

                if (!texture) continue;

                if (texture.image instanceof Array && texture.image.length == 6) {

                    this.setCubeTexture(texture, value);

                } else {

                    this.setTexture(texture, value);

                }

            }

        }

    }

    setCubeTexture(texture, slot) {
        const _gl = this._gl

        if (texture.image.length == 6) {

            if (!texture.image.__webGLTextureCube &&
                !texture.image.__cubeMapInitialized && texture.image.loadCount == 6) {

                texture.image.__webGLTextureCube = _gl.createTexture();

                _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, texture.image.__webGLTextureCube);

                _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_S, _gl.CLAMP_TO_EDGE);
                _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_WRAP_T, _gl.CLAMP_TO_EDGE);

                _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MAG_FILTER, _gl.LINEAR);
                _gl.texParameteri(_gl.TEXTURE_CUBE_MAP, _gl.TEXTURE_MIN_FILTER, _gl.LINEAR_MIPMAP_LINEAR);

                for (var i = 0; i < 6; ++i) {

                    _gl.texImage2D(_gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, texture.image[i]);

                }

                _gl.generateMipmap(_gl.TEXTURE_CUBE_MAP);

                _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, null);

                texture.image.__cubeMapInitialized = true;

            }

            _gl.activeTexture(_gl.TEXTURE0 + slot);
            _gl.bindTexture(_gl.TEXTURE_CUBE_MAP, texture.image.__webGLTextureCube);

        }

    }

    setTexture(texture, slot) {
        const _gl = this._gl

        if (!texture.__webGLTexture && texture.image.loaded) {

            texture.__webGLTexture = _gl.createTexture();
            _gl.bindTexture(_gl.TEXTURE_2D, texture.__webGLTexture);
            _gl.texImage2D(_gl.TEXTURE_2D, 0, _gl.RGBA, _gl.RGBA, _gl.UNSIGNED_BYTE, texture.image);

            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_S, this.paramThreeToGL(texture.wrap_s));
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_WRAP_T, this.paramThreeToGL(texture.wrap_t));

            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MAG_FILTER, this.paramThreeToGL(texture.mag_filter));
            _gl.texParameteri(_gl.TEXTURE_2D, _gl.TEXTURE_MIN_FILTER, this.paramThreeToGL(texture.min_filter));
            _gl.generateMipmap(_gl.TEXTURE_2D);
            _gl.bindTexture(_gl.TEXTURE_2D, null);

        }

        _gl.activeTexture(_gl.TEXTURE0 + slot);
        _gl.bindTexture(_gl.TEXTURE_2D, texture.__webGLTexture);

    }
}

var Snippets = {

    // FOG

    fog_pars_fragment: [

        "#ifdef USE_FOG",

        "uniform vec3 fogColor;",

        "#ifdef FOG_EXP2",
        "uniform float fogDensity;",
        "#else",
        "uniform float fogNear;",
        "uniform float fogFar;",
        "#endif",

        "#endif"

    ].join("\n"),

    fog_fragment: [

        "#ifdef USE_FOG",

        "float depth = gl_FragCoord.z / gl_FragCoord.w;",

        "#ifdef FOG_EXP2",
        "const float LOG2 = 1.442695;",
        "float fogFactor = exp2( - fogDensity * fogDensity * depth * depth * LOG2 );",
        "fogFactor = 1.0 - clamp( fogFactor, 0.0, 1.0 );",
        "#else",
        "float fogFactor = smoothstep( fogNear, fogFar, depth );",
        "#endif",

        "gl_FragColor = mix( gl_FragColor, vec4( fogColor, gl_FragColor.w ), fogFactor );",

        "#endif"

    ].join("\n"),

    // ENVIRONMENT MAP

    envmap_pars_fragment: [

        "#ifdef USE_ENVMAP",

        "varying vec3 vReflect;",
        "uniform float reflectivity;",
        "uniform samplerCube env_map;",
        "uniform int combine;",

        "#endif"

    ].join("\n"),

    envmap_fragment: [

        "#ifdef USE_ENVMAP",

        "cubeColor = textureCube( env_map, vec3( -vReflect.x, vReflect.yz ) );",

        "if ( combine == 1 ) {",

        "gl_FragColor = mix( gl_FragColor, cubeColor, reflectivity );",

        "} else {",

        "gl_FragColor = gl_FragColor * cubeColor;",

        "}",

        "#endif"

    ].join("\n"),

    envmap_pars_vertex: [

        "#ifdef USE_ENVMAP",

        "varying vec3 vReflect;",
        "uniform float refraction_ratio;",
        "uniform bool useRefract;",

        "#endif"

    ].join("\n"),

    envmap_vertex: [

        "#ifdef USE_ENVMAP",

        "vec4 mPosition = objectMatrix * vec4( position, 1.0 );",
        "vec3 nWorld = mat3( objectMatrix[0].xyz, objectMatrix[1].xyz, objectMatrix[2].xyz ) * normal;",

        "if ( useRefract ) {",

        "vReflect = refract( normalize( mPosition.xyz - cameraPosition ), normalize( nWorld.xyz ), refraction_ratio );",

        "} else {",

        "vReflect = reflect( normalize( mPosition.xyz - cameraPosition ), normalize( nWorld.xyz ) );",

        "}",

        "#endif"

    ].join("\n"),

    // COLOR MAP (particles)

    map_particle_pars_fragment: [

        "#ifdef USE_MAP",

        "uniform sampler2D map;",

        "#endif"

    ].join("\n"),


    map_particle_fragment: [

        "#ifdef USE_MAP",

        "mapColor = texture2D( map, gl_PointCoord );",

        "#endif"

    ].join("\n"),

    // COLOR MAP (triangles)

    map_pars_fragment: [

        "#ifdef USE_MAP",

        "varying vec2 vUv;",
        "uniform sampler2D map;",

        "#endif"

    ].join("\n"),

    map_pars_vertex: [

        "#ifdef USE_MAP",

        "varying vec2 vUv;",

        "#endif"

    ].join("\n"),

    map_fragment: [

        "#ifdef USE_MAP",

        "mapColor = texture2D( map, vUv );",

        "#endif"

    ].join("\n"),

    map_vertex: [

        "#ifdef USE_MAP",

        "vUv = uv;",

        "#endif"

    ].join("\n"),

    // LIGHT MAP

    lightmap_pars_fragment: [

        "#ifdef USE_LIGHTMAP",

        "varying vec2 vUv2;",
        "uniform sampler2D light_map;",

        "#endif"

    ].join("\n"),

    lightmap_pars_vertex: [

        "#ifdef USE_LIGHTMAP",

        "varying vec2 vUv2;",

        "#endif"

    ].join("\n"),

    lightmap_fragment: [

        "#ifdef USE_LIGHTMAP",

        "lightmapColor = texture2D( light_map, vUv2 );",

        "#endif"

    ].join("\n"),

    lightmap_vertex: [

        "#ifdef USE_LIGHTMAP",

        "vUv2 = uv2;",

        "#endif"

    ].join("\n"),

    lights_pars_vertex: [

        "uniform bool enableLighting;",
        "uniform vec3 ambientLightColor;",

        "#if MAX_DIR_LIGHTS > 0",

        "uniform vec3 directionalLightColor[ MAX_DIR_LIGHTS ];",
        "uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",

        "#endif",

        "#if MAX_POINT_LIGHTS > 0",

        "uniform vec3 pointLightColor[ MAX_POINT_LIGHTS ];",
        "uniform vec3 pointLightPosition[ MAX_POINT_LIGHTS ];",

        "#ifdef PHONG",
        "varying vec3 vPointLightVector[ MAX_POINT_LIGHTS ];",
        "#endif",

        "#endif"

    ].join("\n"),

    // LIGHTS

    lights_vertex: [

        "if ( !enableLighting ) {",

        "vLightWeighting = vec3( 1.0 );",

        "} else {",

        "vLightWeighting = ambientLightColor;",

        "#if MAX_DIR_LIGHTS > 0",

        "for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {",

        "vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",
        "float directionalLightWeighting = max( dot( transformedNormal, normalize( lDirection.xyz ) ), 0.0 );",
        "vLightWeighting += directionalLightColor[ i ] * directionalLightWeighting;",

        "}",

        "#endif",

        "#if MAX_POINT_LIGHTS > 0",

        "for( int i = 0; i < MAX_POINT_LIGHTS; i++ ) {",

        "vec4 lPosition = viewMatrix * vec4( pointLightPosition[ i ], 1.0 );",
        "vec3 pointLightVector = normalize( lPosition.xyz - mvPosition.xyz );",
        "float pointLightWeighting = max( dot( transformedNormal, pointLightVector ), 0.0 );",
        "vLightWeighting += pointLightColor[ i ] * pointLightWeighting;",

        "#ifdef PHONG",
        "vPointLightVector[ i ] = pointLightVector;",
        "#endif",

        "}",

        "#endif",

        "}"

    ].join("\n"),

    lights_pars_fragment: [

        "#if MAX_DIR_LIGHTS > 0",
        "uniform vec3 directionalLightDirection[ MAX_DIR_LIGHTS ];",
        "#endif",

        "#if MAX_POINT_LIGHTS > 0",
        "varying vec3 vPointLightVector[ MAX_POINT_LIGHTS ];",
        "#endif",

        "varying vec3 vViewPosition;",
        "varying vec3 vNormal;"

    ].join("\n"),

    lights_fragment: [

        "vec3 normal = normalize( vNormal );",
        "vec3 viewPosition = normalize( vViewPosition );",

        "vec4 mSpecular = vec4( specular, opacity );",

        "#if MAX_POINT_LIGHTS > 0",

        "vec4 pointDiffuse  = vec4( 0.0 );",
        "vec4 pointSpecular = vec4( 0.0 );",

        "for( int i = 0; i < MAX_POINT_LIGHTS; i++ ) {",

        "vec3 pointVector = normalize( vPointLightVector[ i ] );",
        "vec3 pointHalfVector = normalize( vPointLightVector[ i ] + vViewPosition );",

        "float pointDotNormalHalf = dot( normal, pointHalfVector );",
        "float pointDiffuseWeight = max( dot( normal, pointVector ), 0.0 );",

        "float pointSpecularWeight = 0.0;",
        "if ( pointDotNormalHalf >= 0.0 )",
        "pointSpecularWeight = pow( pointDotNormalHalf, shininess );",

        "pointDiffuse  += mColor * pointDiffuseWeight;",
        "pointSpecular += mSpecular * pointSpecularWeight;",

        "}",

        "#endif",

        "#if MAX_DIR_LIGHTS > 0",

        "vec4 dirDiffuse  = vec4( 0.0 );",
        "vec4 dirSpecular = vec4( 0.0 );",

        "for( int i = 0; i < MAX_DIR_LIGHTS; i++ ) {",

        "vec4 lDirection = viewMatrix * vec4( directionalLightDirection[ i ], 0.0 );",

        "vec3 dirVector = normalize( lDirection.xyz );",
        "vec3 dirHalfVector = normalize( lDirection.xyz + vViewPosition );",

        "float dirDotNormalHalf = dot( normal, dirHalfVector );",

        "float dirDiffuseWeight = max( dot( normal, dirVector ), 0.0 );",

        "float dirSpecularWeight = 0.0;",
        "if ( dirDotNormalHalf >= 0.0 )",
        "dirSpecularWeight = pow( dirDotNormalHalf, shininess );",

        "dirDiffuse  += mColor * dirDiffuseWeight;",
        "dirSpecular += mSpecular * dirSpecularWeight;",

        "}",

        "#endif",

        "vec4 totalLight = vec4( ambient, opacity );",

        "#if MAX_DIR_LIGHTS > 0",
        "totalLight += dirDiffuse + dirSpecular;",
        "#endif",

        "#if MAX_POINT_LIGHTS > 0",
        "totalLight += pointDiffuse + pointSpecular;",
        "#endif"

    ].join("\n"),

    // VERTEX COLORS

    color_pars_fragment: [

        "#ifdef USE_COLOR",

        "varying vec3 vColor;",

        "#endif"

    ].join("\n"),


    color_fragment: [

        "#ifdef USE_COLOR",

        "vertexColor = vec4( vColor, opacity );",

        "#endif"

    ].join("\n"),

    color_pars_vertex: [

        "#ifdef USE_COLOR",

        "varying vec3 vColor;",

        "#endif"

    ].join("\n"),


    color_vertex: [

        "#ifdef USE_COLOR",

        "vColor = color;",

        "#endif"

    ].join("\n")


};

var UniformsLib = {

    common: {

        "diffuse": { type: "c", value: new Color(0xeeeeee) },
        "opacity": { type: "f", value: 1 },
        "map": { type: "t", value: 0, texture: null },

        "light_map": { type: "t", value: 2, texture: null },

        "env_map": { type: "t", value: 1, texture: null },
        "useRefract": { type: "i", value: 0 },
        "reflectivity": { type: "f", value: 1 },
        "refraction_ratio": { type: "f", value: 0.98 },
        "combine": { type: "i", value: 0 },

        "fogDensity": { type: "f", value: 0.00025 },
        "fogNear": { type: "f", value: 1 },
        "fogFar": { type: "f", value: 2000 },
        "fogColor": { type: "c", value: new Color(0xffffff) }

    },

    lights: {

        "enableLighting": { type: "i", value: 1 },
        "ambientLightColor": { type: "fv", value: [] },
        "directionalLightDirection": { type: "fv", value: [] },
        "directionalLightColor": { type: "fv", value: [] },
        "pointLightPosition": { type: "fv", value: [] },
        "pointLightColor": { type: "fv", value: [] }

    },

    particle: {

        "psColor": { type: "c", value: new Color(0xeeeeee) },
        "opacity": { type: "f", value: 1 },
        "size": { type: "f", value: 1 },
        "map": { type: "t", value: 0, texture: null },

        "fogDensity": { type: "f", value: 0.00025 },
        "fogNear": { type: "f", value: 1 },
        "fogFar": { type: "f", value: 2000 },
        "fogColor": { type: "c", value: new Color(0xffffff) }

    }

};

var ShaderLib = {

    'depth': {

        uniforms: {
            "mNear": { type: "f", value: 1.0 },
            "mFar": { type: "f", value: 2000.0 }
        },

        fragment_shader: [

            "uniform float mNear;",
            "uniform float mFar;",

            "void main() {",

            "float depth = gl_FragCoord.z / gl_FragCoord.w;",
            "float color = 1.0 - smoothstep( mNear, mFar, depth );",
            "gl_FragColor = vec4( vec3( color ), 1.0 );",

            "}"

        ].join("\n"),

        vertex_shader: [

            "void main() {",

            "gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );",

            "}"

        ].join("\n")

    },

    'normal': {

        uniforms: {},

        fragment_shader: [

            "varying vec3 vNormal;",

            "void main() {",

            "gl_FragColor = vec4( 0.5 * normalize( vNormal ) + 0.5, 1.0 );",

            "}"

        ].join("\n"),

        vertex_shader: [

            "varying vec3 vNormal;",

            "void main() {",

            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",
            "vNormal = normalize( normalMatrix * normal );",

            "gl_Position = projectionMatrix * mvPosition;",

            "}"

        ].join("\n")

    },

    'basic': {

        uniforms: UniformsLib["common"],

        fragment_shader: [

            "uniform vec3 diffuse;",
            "uniform float opacity;",

            Snippets["map_pars_fragment"],
            Snippets["lightmap_pars_fragment"],
            Snippets["envmap_pars_fragment"],
            Snippets["fog_pars_fragment"],

            "void main() {",

            "vec4 mColor = vec4( diffuse, opacity );",
            "vec4 mapColor = vec4( 1.0 );",
            "vec4 lightmapColor = vec4( 1.0 );",
            "vec4 cubeColor = vec4( 1.0 );",

            Snippets["map_fragment"],
            Snippets["lightmap_fragment"],

            "gl_FragColor = mColor * mapColor * lightmapColor;",

            Snippets["envmap_fragment"],
            Snippets["fog_fragment"],

            "}"

        ].join("\n"),

        vertex_shader: [

            Snippets["map_pars_vertex"],
            Snippets["lightmap_pars_vertex"],
            Snippets["envmap_pars_vertex"],

            "void main() {",

            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

            Snippets["map_vertex"],
            Snippets["lightmap_vertex"],
            Snippets["envmap_vertex"],

            "gl_Position = projectionMatrix * mvPosition;",

            "}"

        ].join("\n")

    },

    'lambert': {

        uniforms: Uniforms.merge([UniformsLib["common"],
        UniformsLib["lights"]]),

        fragment_shader: [

            "uniform vec3 diffuse;",
            "uniform float opacity;",

            "varying vec3 vLightWeighting;",

            Snippets["map_pars_fragment"],
            Snippets["lightmap_pars_fragment"],
            Snippets["envmap_pars_fragment"],
            Snippets["fog_pars_fragment"],

            "void main() {",

            "vec4 mColor = vec4( diffuse, opacity );",
            "vec4 mapColor = vec4( 1.0 );",
            "vec4 lightmapColor = vec4( 1.0 );",
            "vec4 cubeColor = vec4( 1.0 );",

            Snippets["map_fragment"],
            Snippets["lightmap_fragment"],

            "gl_FragColor =  mColor * mapColor * lightmapColor * vec4( vLightWeighting, 1.0 );",

            Snippets["envmap_fragment"],
            Snippets["fog_fragment"],

            "}"

        ].join("\n"),

        vertex_shader: [

            "varying vec3 vLightWeighting;",

            Snippets["map_pars_vertex"],
            Snippets["lightmap_pars_vertex"],
            Snippets["envmap_pars_vertex"],
            Snippets["lights_pars_vertex"],

            "void main() {",

            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

            Snippets["map_vertex"],
            Snippets["lightmap_vertex"],
            Snippets["envmap_vertex"],

            "vec3 transformedNormal = normalize( normalMatrix * normal );",

            Snippets["lights_vertex"],

            "gl_Position = projectionMatrix * mvPosition;",

            "}"

        ].join("\n")

    },

    'phong': {

        uniforms: Uniforms.merge([UniformsLib["common"],
        UniformsLib["lights"],

        {
            "ambient": { type: "c", value: new Color(0x050505) },
            "specular": { type: "c", value: new Color(0x111111) },
            "shininess": { type: "f", value: 30 }
        }

        ]),

        fragment_shader: [

            "uniform vec3 diffuse;",
            "uniform float opacity;",

            "uniform vec3 ambient;",
            "uniform vec3 specular;",
            "uniform float shininess;",

            "varying vec3 vLightWeighting;",

            Snippets["map_pars_fragment"],
            Snippets["lightmap_pars_fragment"],
            Snippets["envmap_pars_fragment"],
            Snippets["fog_pars_fragment"],
            Snippets["lights_pars_fragment"],

            "void main() {",

            "vec4 mColor = vec4( diffuse, opacity );",
            "vec4 mapColor = vec4( 1.0 );",
            "vec4 lightmapColor = vec4( 1.0 );",
            "vec4 cubeColor = vec4( 1.0 );",

            Snippets["map_fragment"],
            Snippets["lights_fragment"],
            Snippets["lightmap_fragment"],

            "gl_FragColor =  mapColor * lightmapColor * totalLight * vec4( vLightWeighting, 1.0 );",

            Snippets["envmap_fragment"],
            Snippets["fog_fragment"],

            "}"

        ].join("\n"),

        vertex_shader: [

            "#define PHONG",

            "varying vec3 vLightWeighting;",
            "varying vec3 vViewPosition;",
            "varying vec3 vNormal;",

            Snippets["map_pars_vertex"],
            Snippets["lightmap_pars_vertex"],
            Snippets["envmap_pars_vertex"],
            Snippets["lights_pars_vertex"],

            "void main() {",

            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

            Snippets["map_vertex"],
            Snippets["lightmap_vertex"],
            Snippets["envmap_vertex"],

            "#ifndef USE_ENVMAP",
            "vec4 mPosition = objectMatrix * vec4( position, 1.0 );",
            "#endif",

            "vViewPosition = cameraPosition - mPosition.xyz;",

            "vec3 transformedNormal = normalize( normalMatrix * normal );",
            "vNormal = transformedNormal;",

            Snippets["lights_vertex"],

            "gl_Position = projectionMatrix * mvPosition;",

            "}"

        ].join("\n")

    },

    'particle_basic': {

        uniforms: UniformsLib["particle"],

        fragment_shader: [

            "uniform vec3 psColor;",
            "uniform float opacity;",

            Snippets["color_pars_fragment"],
            Snippets["map_particle_pars_fragment"],
            Snippets["fog_pars_fragment"],

            "void main() {",

            "vec4 mColor = vec4( psColor, opacity );",
            "vec4 mapColor = vec4( 1.0 );",
            "vec4 vertexColor = vec4( 1.0 );",

            Snippets["map_particle_fragment"],
            Snippets["color_fragment"],

            "gl_FragColor = mColor * mapColor * vertexColor;",

            Snippets["fog_fragment"],

            "}"

        ].join("\n"),

        vertex_shader: [

            "uniform float size;",

            Snippets["color_pars_vertex"],

            "void main() {",

            Snippets["color_vertex"],

            "vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );",

            "gl_Position = projectionMatrix * mvPosition;",
            "gl_PointSize = size;",
            //"gl_PointSize = 10.0 + 6.0 * mvPosition.z;";

            "}"

        ].join("\n")

    }


};
