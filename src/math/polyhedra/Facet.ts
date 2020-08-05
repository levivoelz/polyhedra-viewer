import { once } from "lodash-es"
import { Vector3, Ray, Matrix4 } from "three"
import { translateMat, getCentroid, withOrigin } from "math/geom"
import type Polyhedron from "./Polyhedron"
import type Vertex from "./Vertex"

export default abstract class Facet {
  polyhedron: Polyhedron

  constructor(polyhedron: Polyhedron) {
    this.polyhedron = polyhedron
  }

  abstract normal(): Vector3

  abstract get vertices(): Vertex[]

  centroid = once(() => getCentroid(this.vertices.map((v) => v.vec)))

  normalRay() {
    return new Ray(this.centroid(), this.normal())
  }

  distanceToCenter() {
    const origin = this.polyhedron.centroid()
    return origin.distanceTo(this.centroid())
  }

  /** Get the rotation matrix for rotation around this face's normal */
  rotateNormal(angle: number) {
    return new Matrix4().makeRotationAxis(this.normal(), angle)
  }

  /** Get the matrix for translating a point the given amount in the direction of this normal */
  translateNormal(amount: number) {
    const scaled = this.normal().clone().setLength(amount)
    return translateMat(scaled)
  }

  /** Return the given transform using this facet's centroid as origin */
  withCentroidOrigin(mat: Matrix4) {
    return withOrigin(this.centroid(), mat)
  }
}