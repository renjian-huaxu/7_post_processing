import Color from "./core/Color";
import Vector2 from "./core/Vector2";
import Vector3 from "./core/Vector3";
import Vector4 from "./core/Vector4";
import Matrix4 from "./core/Matrix4";
import Vertex from "./core/Vertex";
import Face3 from "./core/Face3";
import Face4 from "./core/Face4";
import UV from "./core/UV";
import Geometry from "./core/Geometry";
import Ray from "./core/Ray";

import Camera from "./cameras/Camera";

import AmbientLight from "./lights/AmbientLight";
import DirectionalLight from "./lights/DirectionalLight";
import PointLight from "./lights/PointLight";

import Object3D from "./objects/Object3D";
import Mesh from "./objects/Mesh";
import Particle from "./objects/Particle";
import ParticleSystem from "./objects/ParticleSystem";
import Line from "./objects/Line";

import MeshPhongMaterial  from "./materials/MeshPhongMaterial";
import MeshFaceMaterial  from "./materials/MeshFaceMaterial";

import LineBasicMaterial  from "./materials/LineBasicMaterial";
import MeshBasicMaterial  from "./materials/MeshBasicMaterial";
import MeshLambertMaterial  from "./materials/MeshLambertMaterial";
import MeshDepthMaterial  from "./materials/MeshDepthMaterial";
import MeshNormalMaterial  from "./materials/MeshNormalMaterial";
import MeshShaderMaterial  from "./materials/MeshShaderMaterial";
import ParticleBasicMaterial  from "./materials/ParticleBasicMaterial";

import UVMapping  from "./materials/mappings/UVMapping"

import Texture  from "./materials/textures/Texture";
import { RepeatWrapping, LinearFilter, NearestFilter }  from "./materials/textures/Texture";

import CubeRefractionMapping from './materials/mappings/CubeRefractionMapping'

import { FlatShading, AdditiveBlending } from './materials/Material'

import RenderTarget from './materials/RenderTarget'
import Uniforms from './materials/Uniforms'


import Scene from "./scenes/Scene";
import FogExp2 from "./scenes/FogExp2";
import Fog from "./scenes/Fog";

import WebGLRenderer from "./renderers/WebGLRenderer";
import Projector from './renderers/Projector'

import Plane from "./primitives/Plane";
import Cube from "./primitives/Cube";
import Cylinder from "./primitives/Cylinder";
import Sphere from "./primitives/Sphere";


import Loader from "./extras/io/Loader";

export default { 
    Color,
    Vector2,
    Vector3,
    Vector4,
    Matrix4,
    Vertex,
    Face3,
    Face4,
    UV,
    Geometry,
    Ray,

    Camera,

    AmbientLight,
    DirectionalLight,
    PointLight,

    Object3D,
    Mesh,
    Particle,
    ParticleSystem,
    Line,

    MeshPhongMaterial,
    MeshFaceMaterial,

    LineBasicMaterial,
    MeshBasicMaterial,
    MeshLambertMaterial,
    MeshDepthMaterial,
    MeshNormalMaterial,
    MeshShaderMaterial,
    ParticleBasicMaterial,

    Texture,
    RepeatWrapping,
    LinearFilter,
    NearestFilter,
    CubeRefractionMapping,

    UVMapping,

    FlatShading,
    AdditiveBlending,

    RenderTarget,
    Uniforms,

    Scene,
    FogExp2,
    Fog,

    WebGLRenderer,
    Projector,

    Plane,
    Cube,
    Cylinder,
    Sphere,

    Loader

}