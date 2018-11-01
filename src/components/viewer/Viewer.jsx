// @flow
import _ from 'lodash';
// $FlowFixMe
import React, { useEffect, Fragment } from 'react';
import { Route, Redirect, type RouterHistory } from 'react-router-dom';

import { Polyhedron } from 'math/polyhedra';
import { usePageTitle, wrapProviders } from 'components/common';
import {
  OperationModel,
  TransitionModel,
  PolyhedronModel,
  PathSetterProvider,
} from './context';
import DesktopViewer from './DesktopViewer';
import MobileViewer from './MobileViewer';
import useMediaInfo from 'components/useMediaInfo';
import { unescapeName } from 'math/polyhedra/names';

interface InnerProps {
  solid: string;
  panel: string;
  history: RouterHistory;
}

function InnerViewer({ solid, panel, history }: InnerProps) {
  const { unsetOperation } = OperationModel.useActions();
  const { setPolyhedron } = PolyhedronModel.useActions();
  usePageTitle(`${_.capitalize(unescapeName(solid))} - Polyhedra Viewer`);

  const nonOperation = panel !== 'operations' || history.action === 'POP';
  useEffect(
    () => {
      if (nonOperation) {
        unsetOperation();
        // TODO cancel animations
      }
    },
    [panel, history.action],
  );

  useEffect(
    () => {
      if (nonOperation) setPolyhedron(Polyhedron.get(solid));
    },
    [solid, history.action],
  );

  const { device } = useMediaInfo();

  const Viewer = device === 'desktop' ? DesktopViewer : MobileViewer;

  return <Viewer solid={solid} panel={panel} />;
}

interface Props {
  solid: string;
  url: string;
  history: RouterHistory;
}

const Providers = wrapProviders([
  TransitionModel.Provider,
  OperationModel.Provider,
  PathSetterProvider,
]);

export default function Viewer({ solid, history, url }: Props) {
  return (
    <Fragment>
      <Route
        exact
        path={url}
        render={() => <Redirect to={`${url}/operations`} />}
      />
      <Route
        path={`${url}/:panel`}
        render={({ match, history }) => {
          const { panel } = match.params;

          return (
            <PolyhedronModel.Provider name={solid}>
              <Providers>
                <InnerViewer
                  history={history}
                  solid={solid}
                  panel={panel || ''}
                />
              </Providers>
            </PolyhedronModel.Provider>
          );
        }}
      />
    </Fragment>
  );
}
