import * as _ from 'lodash'
import { fromConwayNotation, toConwayNotation } from 'constants/polyhedra'
import periodicTable from 'constants/periodicTable'

const archimedean = {
  T: {
    d: 'T',
    t: 'tT',
    r: 'O',
  },
  C: {
    d: 'O',
    t: 'tC',
    r: 'aC',
    e: 'eC',
  },
  O: {
    t: 'tO',
    r: 'aC',
    e: 'eC',
    s: 'I',
  },
  aC: {
    t: 'bC',
    r: 'eC',
    s: 'sC',
  },
  D: {
    d: 'D',
    t: 'tD',
    r: 'aD',
    e: 'eD',
  },
  I: {
    t: 'tI',
    r: 'aD',
    e: 'eD',
  },
  aD: {
    t: 'bD',
    r: 'eD',
    s: 'sD',
  },
}

// Make everything an array
function normalize(graph) {
  return _.mapValues(graph, ops => _.mapValues(ops, _.castArray))
}

const customizer = (objValue, srcValue) => {
  if (_.isArray(objValue)) {
    return objValue.concat(srcValue)
  }
}
function graphMerge(object, ...other) {
  return _.mergeWith(object, ...other, customizer)
}

const getInverseOperation = operation => {
  switch (operation) {
    // dual
    case 'd':
    case 'g':
      return operation
    // agument / diminish
    case '+':
      return '-'
    case '-':
      return '+'
    default:
      return `~${operation}`
  }
}

function makeBidirectional(graph) {
  const result = {}
  for (let [source, operations] of Object.entries(graph)) {
    for (let [operation, sinks] of Object.entries(operations)) {
      for (let sink of sinks) {
        if (!sink) {
          continue
        }
        if (!result[sink]) {
          result[sink] = {}
        }
        const reverseOp = getInverseOperation(operation)
        if (!result[sink][reverseOp]) {
          result[sink][reverseOp] = []
        }
        if (sink === source) {
          continue
        }
        result[sink][reverseOp].push(source)
      }
    }
  }
  return graphMerge(result, graph)
}

const invalidNames = ['concave', 'coplanar']
function convertTableNotation(notation) {
  if (_.isArray(notation)) return notation.map(convertTableNotation)
  if (notation[0] === '!') return notation.substring(1)
  if (_.includes(invalidNames, notation)) return null
  return notation
}

function convertTable(table) {
  if (!table.data) return null
  return table.data.map(row => row.map(convertTableNotation))
}

// TODO figure out a way to do this without the table (or inverse the relationship)
const [, prisms, , pyramidsCupolae, augmentations] = periodicTable.map(
  convertTable,
)

const getPyramidRow = index => pyramidsCupolae[index > 2 ? index + 1 : index]

const hasCupolaRotunda = index => _.includes([6, 8], index)
const cupolaRotunda = pyramidsCupolae[7]

const getAugmentations = (rowIndex, colIndex) => {
  return _([
    pyramidsCupolae[rowIndex][colIndex],
    hasCupolaRotunda(rowIndex) && cupolaRotunda[colIndex],
  ])
    .flatten()
    .compact()
    .value()
}

const basePyramidsCupolae = (() => {
  let graph = {}
  // relation of prisms and antiprisms
  _.forEach(prisms, (row, index) => {
    const [prism, antiprism] = row
    const pyramidRow = getPyramidRow(index)
    graph = graphMerge(graph, {
      [prism]: {
        '+': pyramidRow[1],
      },
      [antiprism]: {
        '+': pyramidRow[2],
      },
    })
  })

  // TODO don't create stray nulls
  _.forEach(pyramidsCupolae, (row, index) => {
    graph = graphMerge(graph, {
      [row[0]]: {
        P: row[1],
        A: row[2],
        '+': getAugmentations(index, 3),
      },
      [row[1]]: {
        '+': getAugmentations(index, 4),
      },
      [row[2]]: {
        '+': getAugmentations(index, 5),
      },
      [row[5]]: {
        g: row[5],
      },
    })

    if (!_.isArray(row[3])) {
      graph = graphMerge(graph, {
        [row[3]]: {
          P: row[4],
          A: row[5],
        },
      })
    } else {
      graph = graphMerge(graph, {
        [row[3][0]]: {
          P: row[4][0],
          A: row[5],
        },
        [row[3][1]]: {
          P: row[4][1],
          A: row[5],
        },
      })
    }

    // gyrate relationships
    for (let cell of row) {
      if (_.isArray(cell)) {
        const [c1, c2] = cell
        graph = graphMerge(graph, {
          [c1]: {
            g: c2,
          },
        })
      }
    }
  })

  return graph
})()

const baseAugmentations = (() => {
  const rowNames = periodicTable[4].rows
  let graph = {}
  _.forEach(augmentations, (row, index) => {
    const base = toConwayNotation(rowNames[index])
    graph = graphMerge(graph, {
      [base]: {
        '+': row[0],
      },
      [row[0]]: {
        '+': row[1],
      },
      [_.isArray(row[1]) ? row[1][1] : row[1]]: {
        '+': row[2],
      },
    })
  })
  return graph
})()

const diminishedIcosahedraGraph = (() => {
  return {
    J63: {
      '+': ['J62', 'J64'],
    },
    J62: {
      '+': 'J11',
    },
  }
})()

const rhombicosidodecahedraGraph = (() => {
  return {
    eD: {
      g: 'J72',
      '-': 'J76',
    },
    J72: {
      g: ['J73', 'J74'],
      '-': ['J76', 'J77', 'J78'],
    },
    J73: {
      '-': 'J77',
    },
    J74: {
      g: 'J75',
      '-': ['J78', 'J79'],
    },
    J75: {
      '-': ['J79'],
    },
    J76: {
      g: ['J77', 'J78'],
      '-': ['J80', 'J81'],
    },
    J77: {
      '-': 'J80',
    },
    J78: {
      '-': ['J81', 'J82'],
    },
    J79: {
      '-': ['J82'],
    },
    J81: {
      g: 'J82',
      '-': 'J83',
    },
    J82: {
      '-': 'J83',
    },
  }
})()

const othersGraph = (() => {
  return {
    // snub antiprisms
    T: {
      s: 'J84',
    },
    A4: {
      s: 'J85',
    },

    // "other" johnson solids
    J86: {
      '+': 'J87',
    },
  }
})()

const normalized = [
  archimedean,
  basePyramidsCupolae,
  baseAugmentations,
  diminishedIcosahedraGraph,
  rhombicosidodecahedraGraph,
  othersGraph,
].map(normalize)

const baseGraph = graphMerge(...normalized)
export const polyhedraGraph = makeBidirectional(baseGraph)

// Get the polyhedron name as a result of applying the operation to the given polyhedron
export function getNextPolyhedron(solid, operation) {
  const next = polyhedraGraph[toConwayNotation(solid)][operation]
  // FIXME handle more than one gyration possibility
  if (next.length > 1) {
    throw new Error('Cannot deal with more than one possibility right now')
  }
  return fromConwayNotation(next[0])
}