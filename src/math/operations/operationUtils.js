// @flow strict
import _ from 'lodash';

import { flatMap, repeat } from 'util.js';
import { Polyhedron, Vertex, Face, type VertexArg } from 'math/polyhedra';
import { vec, PRECISION, getPlane, rotateAround } from 'math/linAlg';
import { type Relation } from './operationTypes';

export const hasMultiple = (relations: ?(Relation[]), property: string) =>
  _(relations)
    .map(property)
    .uniq()
    .compact()
    .value().length > 1;

// Remove vertices (and faces) from the polyhedron when they are all the same
export function deduplicateVertices(polyhedron: Polyhedron) {
  // group vertex indices by same
  const unique = [];
  const oldToNew = {};

  _.forEach(polyhedron.vertices, (v, vIndex: number) => {
    const match = _.find(unique, point =>
      v.vec.equalsWithTolerance(point.vec, PRECISION),
    );
    if (match === undefined) {
      unique.push(v);
      oldToNew[vIndex] = vIndex;
    } else {
      oldToNew[vIndex] = match.index;
    }
  });

  // replace vertices that are the same
  // TODO create a filterFaces method?
  let newFaces = _(polyhedron.faces)
    .map(face => _.uniq(face.vertices.map(v => oldToNew[v.index])))
    .filter(vIndices => vIndices.length >= 3)
    .value();

  // remove extraneous vertices
  return removeExtraneousVertices(
    polyhedron.withChanges(s => s.withFaces(newFaces)),
  );
}

/**
 * Remove vertices in the polyhedron that aren't connected to any faces,
 * and remap the faces to the smaller indices
 */
export function removeExtraneousVertices(polyhedron: Polyhedron) {
  // Vertex indices to remove
  const vertsInFaces = _.flatMap(polyhedron.faces, 'vertices');
  const toRemove = _.filter(polyhedron.vertices, v => !v.inSet(vertsInFaces));
  const numToRemove = toRemove.length;

  // Map the `numToRemove` last vertices of the polyhedron (that don't overlap)
  // to the first few removed vertices
  const newToOld = _(polyhedron.vertices)
    .takeRight(numToRemove)
    .filter(v => !v.inSet(toRemove))
    .map((v, i) => [v.index, toRemove[i].index])
    .fromPairs()
    .value();
  const oldToNew = _.invert(newToOld);

  const newVertices = _(polyhedron.vertices)
    .map(v => polyhedron.vertices[_.get(oldToNew, v.index, v.index)])
    .dropRight(numToRemove)
    .value();

  return polyhedron.withChanges(solid =>
    solid
      .withVertices(newVertices)
      .mapFaces(face =>
        _.map(face.vertices, v => _.get(newToOld, v.index, v.index)),
      ),
  );
}

function getEdgeFacePaths(edge, twist) {
  const [v1, v2] = _.map(edge.vertices, 'index');
  const [f1, f2] = _.map(edge.adjacentFaces(), 'index');
  switch (twist) {
    case 'right':
      return [
        [[f1, v1], [f2, v2], [f1, v2]], // face 1
        [[f1, v1], [f2, v1], [f2, v2]], // face 2
      ];
    case 'left':
      return [
        [[f1, v2], [f1, v1], [f2, v1]], // face 1
        [[f2, v1], [f2, v2], [f1, v2]], // face 2
      ];
    default:
      return [[[f1, v2], [f1, v1], [f2, v1], [f2, v2]]];
  }
}

/**
 * Duplicate the vertices, so that each face has its own unique set of vertices,
 * and create a new face for each edge and new vertex set.
 */
export function duplicateVertices(
  polyhedron: Polyhedron,
  twist?: 'left' | 'right',
) {
  const count = polyhedron.getVertex().adjacentFaces().length;

  const newVertexMapping = {};
  _.forEach(polyhedron.vertices, (v, vIndex: number) => {
    // For each vertex, pick one adjacent face to be the "head"
    // for every other adjacent face, map it to a duplicated vertex
    _.forEach(v.adjacentFaces(), (f, i) => {
      _.set(newVertexMapping, [f.index, v.index], v.index * count + i);
    });
  });

  return polyhedron.withChanges(solid =>
    solid
      .withVertices(flatMap(polyhedron.vertices, v => repeat(v.value, count)))
      .mapFaces(face =>
        face.vertices.map(v => newVertexMapping[face.index][v.index]),
      )
      .addFaces(
        _.map(polyhedron.vertices, v =>
          _.range(v.index * count, (v.index + 1) * count),
        ),
      )
      .addFaces(
        _.flatMap(polyhedron.edges, edge =>
          _.map(getEdgeFacePaths(edge, twist), face =>
            _.map(face, path => _.get(newVertexMapping, path)),
          ),
        ),
      ),
  );
}

export function getMappedVertices(
  faces: Face[],
  iteratee: (v: Vertex, f: Face) => VertexArg,
) {
  const result = [...faces[0].polyhedron.vertices];
  _.forEach(faces, face => {
    _.forEach(face.vertices, v => {
      result[v.index] = iteratee(v, face);
    });
  });
  return result;
}

export function getResizedVertices(
  faces: Face[],
  resizedLength: number,
  angle: number = 0,
) {
  // Update the vertices with the expanded-out version
  const f0 = faces[0];
  const sideLength = f0.sideLength();
  const baseLength = f0.distanceToCenter() / sideLength;
  return getMappedVertices(faces, (v, face) => {
    const normal = face.normal();
    const rotated =
      angle === 0 ? v.vec : rotateAround(v.vec, face.normalRay(), angle);
    const scale = (resizedLength - baseLength) * sideLength;
    return rotated.add(normal.scale(scale));
  });
}

type ExpansionType = 'cantellate' | 'snub';

export function expansionType(polyhedron: Polyhedron): ExpansionType {
  return _.includes([20, 38, 92], polyhedron.numFaces())
    ? 'snub'
    : 'cantellate';
}

const edgeShape = {
  snub: 3,
  cantellate: 4,
};

export function isExpandedFace(
  polyhedron: Polyhedron,
  face: Face,
  nSides?: number,
) {
  const type = expansionType(polyhedron);
  if (typeof nSides === 'number' && face.numSides !== nSides) return false;
  if (!face.isValid()) return false;
  return _.every(face.adjacentFaces(), { numSides: edgeShape[type] });
}

export function getSnubAngle(polyhedron: Polyhedron, numSides: number) {
  const face0 =
    _.find(polyhedron.faces, face =>
      isExpandedFace(polyhedron, face, numSides),
    ) || polyhedron.getFace();

  const face0AdjacentFaces = face0.vertexAdjacentFaces();
  const faceCentroid = face0.centroid();
  const faceNormal = face0.normal();
  const snubFaces = _.filter(
    polyhedron.faces,
    face =>
      isExpandedFace(polyhedron, face, numSides) &&
      !face.inSet(face0AdjacentFaces),
  );
  const midpoint = face0.edges[0].midpoint();
  const face1 = _.minBy(snubFaces, face =>
    midpoint.distanceTo(face.centroid()),
  );
  const plane = getPlane([
    faceCentroid,
    face1.centroid(),
    polyhedron.centroid(),
  ]);
  const normMidpoint = midpoint.sub(faceCentroid);
  const projected = plane.getProjectedPoint(midpoint).sub(faceCentroid);
  const angle = normMidpoint.angleBetween(projected, true);
  // Return a positive angle if it's a ccw turn, a negative angle otherwise
  const sign = normMidpoint
    .cross(projected)
    .getNormalized()
    .equalsWithTolerance(faceNormal, PRECISION)
    ? -1
    : 1;
  return angle * sign;
}

// export function makeOperation(op: Operation) {
//   return {
//     apply(polyhedron, options) {
//       const opResult = op.apply(polyhedron, options);
//       if (!opResult.animationData) {
//         return { result: opResult };
//       }
//       const { result, animationData } = opResult;
//       const { start, endVertices } = animationData;
//       return {
//         result: result || deduplicateVertices(start.withVertices(endVertices)),
//         animationData: {
//           start,
//           endVertices: endVertices.map(v => v.toArray()),
//         },
//       };
//     },
//     getSearchOptions(polyhedron, options) {
//       return op.getSearchOptions && op.getSearchOptions(polyhedron, options);
//     },
//     getApplyArgs(polyhedron, hitPnt) {
//       return op.getApplyArgs(polyhedron, vec(hitPnt));
//     },
//   };
// }
