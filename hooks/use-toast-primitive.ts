"use client"

import { useReducer } from "react"

type ActionType<T> = {
  [K in keyof T]: T[K] extends (...args: any) => any
    ? (...args: Parameters<T[K]>) => { type: K; payload: Parameters<T[K]>[0] }
    : never
}

type StateType<T> = {
  [K in keyof T]: T[K] extends (...args: any) => any ? ReturnType<T[K]> : never
}

function useToastPrimitive<Reducer extends (state: any, action: any) => any>(
  reducer: Reducer,
  initialState: Parameters<Reducer>[0],
) {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actionTypes = Object.fromEntries(Object.keys(initialState).map((key) => [key, key])) as {
    [K in keyof StateType<typeof initialState>]: K
  }

  type Action =
    | { type: "ADD_TOAST"; payload: any }
    | { type: "UPDATE_TOAST"; payload: any }
    | { type: "DISMISS_TOAST"; payload: any }
    | { type: "REMOVE_TOAST"; payload: any }

  const boundActions = Object.fromEntries(
    Object.keys( actionTypes ).map( ( key ) => [ key, ( payload: any ) => dispatch( { type: key as any, payload } ) ] )
  ) as unknown as ActionType<typeof actionTypes>

  const subscribe = (fn: (state: StateType<typeof initialState>) => void) => {
    fn(state)
    return () => {}
  }

  return {
    state,
    dispatch,
    subscribe,
  }
}

export { useToastPrimitive as useToast }

