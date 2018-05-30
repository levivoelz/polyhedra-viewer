// @flow strict
import _ from 'lodash';
import React, { Fragment } from 'react';
import { css, StyleSheet } from 'aphrodite/no-important';

// import { type OpName } from 'polyhedra/operations';
const { PI, sqrt, sin, cos } = Math;
const TAU = 2 * PI;

const styles = StyleSheet.create({
  operationIcon: {
    width: 50,
    height: 50,
  },

  invariant: {
    fill: 'black',
    stroke: 'black',
    strokeWidth: 2,
  },

  subtracted: {
    fill: 'none',
    stroke: 'black',
    strokeWidth: 5,
    strokeDasharray: 10,
  },

  added: {
    fill: 'none',
    stroke: 'black',
    strokeWidth: 5,
    strokeLinejoin: 'round',
  },

  changed: {
    fill: 'none',
    stroke: 'black',
    strokeWidth: 5,
  },
});

function joinPoints(points) {
  return points.map(point => point.join(',')).join(' ');
}

function Polygon({ n = 3, r = 1, cx = 0, cy = 0, a = 0, ...rest }) {
  const points = _(n)
    .range()
    .map(i => [
      cx + r * cos(TAU * (a / 360 + i / n)),
      cy + r * sin(TAU * (a / 360 + i / n)),
    ])
    .value();

  return <polygon {...rest} points={joinPoints(points)} />;
}

function PolyLine({ points, ...rest }) {
  return <polyline {...rest} points={joinPoints(points)} />;
}

interface TruncateIconProps {
  styled: string;
  innerSides?: number;
  innerScale?: number;
  innerAngle?: number;
}

function TruncateIcon({
  styled,
  innerSides = 6,
  innerScale = 1 / sqrt(3),
  innerAngle = 0,
}: TruncateIconProps) {
  const center = { cx: 100, cy: 120 };
  const r = 100;
  return (
    <Fragment>
      <Polygon
        className={css(styles[styled])}
        n={3}
        r={r}
        a={-90}
        {...center}
      />
      <Polygon
        className={css(styles.invariant)}
        n={innerSides}
        r={r * innerScale}
        a={innerAngle}
        {...center}
      />
    </Fragment>
  );
}

function DualIcon() {
  const center = { cx: 100, cy: 100 };
  const r = 75;
  return (
    <Fragment>
      <Polygon
        className={css(styles.subtracted)}
        n={3}
        r={r}
        a={-90}
        {...center}
      />
      <Polygon className={css(styles.added)} n={3} r={r} a={90} {...center} />
      <Polygon
        className={css(styles.invariant)}
        n={6}
        r={r / sqrt(3)}
        a={0}
        {...center}
      />
    </Fragment>
  );
}

function BaseExpandIcon({ styled, innerAngle, render = _.noop }) {
  const [cx, cy] = [100, 100];
  const r = 75;
  const ap = sqrt(3) * r / 2;
  const r1 = r / sqrt(3);
  const ap1 = r1 / 2;
  return (
    <Fragment>
      <Polygon
        className={css(styles[styled])}
        n={6}
        r={r}
        a={0}
        cx={cx}
        cy={cy}
      />
      <Polygon
        className={css(styles.invariant)}
        n={3}
        r={r1}
        a={innerAngle}
        cx={cx}
        cy={cy}
      />
      {render({ cx, cy, r, ap, r1, ap1 })}
    </Fragment>
  );
}

interface ExpandIconProps {
  styled: string;
  innerStyle?: string;
  render?: *;
}

function ExpandIcon({
  styled,
  innerStyle = styled,
  render = _.noop,
}: ExpandIconProps) {
  return (
    <BaseExpandIcon
      styled={styled}
      innerAngle={-90}
      render={({ cx, cy, r, ap, r1, ap1 }) => (
        <Fragment>
          {_.range(3).map(i => (
            <PolyLine
              key={i}
              className={css(styles[innerStyle])}
              transform={`rotate(${i * 120} ${cx} ${cy})`}
              points={[
                [cx - r / 2, cy - ap],
                [cx, cy - r1],
                [cx + r / 2, cy - ap],
              ]}
            />
          ))}
          {render({ cx, cy, r, ap, r1, ap1 })}
        </Fragment>
      )}
    />
  );
}

function drawIcon(name) {
  switch (name) {
    case 'truncate':
      return <TruncateIcon styled="subtracted" />;
    case 'rectify':
      return (
        <TruncateIcon
          styled="subtracted"
          innerSides={3}
          innerScale={1 / 2}
          innerAngle={90}
        />
      );
    case 'cumulate':
      return <TruncateIcon styled="added" />;
    case 'dual':
      return <DualIcon />;
    case 'expand': {
      return <ExpandIcon styled="added" />;
    }
    case 'snub': {
      return (
        <BaseExpandIcon
          styled="added"
          innerAngle={0}
          render={({ cx, cy, r, ap, r1, ap1 }) =>
            _.range(3).map(i => (
              <PolyLine
                key={i}
                className={css(styles.added)}
                transform={`rotate(${i * 120} ${cx} ${cy})`}
                points={[
                  [cx - ap1, cy - r / 2],
                  [cx - r, cy],
                  [cx - ap1, cy + r / 2],
                  [cx - r / 2, cy + ap],
                ]}
              />
            ))
          }
        />
      );
    }
    case 'contract': {
      return <ExpandIcon styled="subtracted" />;
    }
    case 'twist': {
      return (
        <ExpandIcon
          styled="changed"
          innerStyle="invariant"
          render={({ cx, cy, r, ap, r1, ap1 }) =>
            _.range(3).map(i => (
              <PolyLine
                key={i}
                className={css(styles.changed)}
                transform={`rotate(${i * 120} ${cx} ${cy})`}
                points={[[cx - r / 2, cy + ap1], [cx + r / 2, cy + ap]]}
              />
            ))
          }
        />
      );
    }

    default:
      return (
        <Polygon
          className={css(styles.changed)}
          n={6}
          r={75}
          cx={100}
          cy={100}
          a={0}
        />
      );
  }
}

interface Props {
  // TODO use OpName
  name: string;
}

export default function OperationIcon({ name }: Props) {
  return (
    <svg viewBox="0 0 200 200" className={css(styles.operationIcon)}>
      {drawIcon(name)}
    </svg>
  );
}