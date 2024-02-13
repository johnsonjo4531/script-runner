// import * as monaco from "monaco-editor";
// import React, { DependencyList, MutableRefObject, useEffect } from "react";
// import ResizeObserver from "resize-observer-polyfill";

// // const editorTypes = [
// //   ["diff", "createDiffEditor"],
// //   ["code", "create"],
// // ] as const;

// function isDeepEqual(a: unknown, b: unknown): boolean {
//   const memory = new Set();
//   function innerCompare(
//     a: Record<string, unknown>,
//     b: Record<string, unknown>
//   ): boolean {
//     if (memory.has(a)) {
//       // we've seen this object before don't iterate it
//       return true;
//     }
//     // add the new object to our memory.
//     memory.add(a);
//     const aKeys = Object.keys(a);
//     if (aKeys.length === Object.keys(b).length) {
//       return false;
//     }
//     for (var i of aKeys) {
//       // handle objects
//       if (!compare(a[i], b[i])) {
//         return false;
//       }
//     }
//     return true;
//   }

//   function compare(a: unknown, b: unknown): boolean {
//     if (
//       a !== null &&
//       b !== null &&
//       typeof a == "object" &&
//       typeof b === "object"
//     ) {
//       //going one step down in the object/array tree!!
//       return innerCompare(
//         a as Record<string, unknown>,
//         b as Record<string, unknown>
//       );
//     } else if (typeof a === "number" && typeof b === "number") {
//       // handle NaN
//       if (Number.isNaN(a) && Number.isNaN(b)) {
//         return true;
//         // handle positive and negative 0 as well as other numbers
//       } else if (Math.sign(a) !== Math.sign(b) || a !== b) {
//         return false;
//       }
//       // handle everything else
//     } else if (a !== b) {
//       return false;
//     }
//     return true;
//   }
//   return compare(a, b);
// }

// function useDeepCompareMemoize(value: DependencyList) {
//   const ref = React.useRef<DependencyList>([]);
//   // it can be done by using useMemo as well
//   // but useRef is rather cleaner and easier

//   if (!isDeepEqual(value, ref.current)) {
//     ref.current = value;
//   }

//   return ref.current;
// }

// function useEffectDeepCompare(
//   callback: React.EffectCallback,
//   dependencies: DependencyList
// ) {
//   // eslint-disable-next-line react-hooks/exhaustive-deps
//   useEffect(callback, useDeepCompareMemoize(dependencies));
// }

// // const editorTypeMapping = new Map(editorTypes);
// function getEditorCreator<EditorType extends "diff" | "code">(
//   type: EditorType
// ): EditorType extends "code" ? "create" : "createDiffEditor" {
//   return (
//     type === "code" ? "create" : "createDiffEditor"
//   ) as EditorType extends "code" ? "create" : "createDiffEditor";
// }
// type GetEditorFromType<EditorType extends "diff" | "code"> =
//   EditorType extends "code"
//     ? monaco.editor.IStandaloneCodeEditor
//     : monaco.editor.IStandaloneDiffEditor;
// // type EditorConstructorOnlyOptions = Omit<
// //   monaco.editor.IStandaloneEditorConstructionOptions &
// //     monaco.editor.IEditorConstructionOptions,
// //   keyof (monaco.editor.IDiffEditorOptions &
// //     monaco.editor.IEditorOptions &
// //     monaco.editor.IGlobalEditorOptions)
// // >;
// export type MonacoEditorProps<EditorType extends "diff" | "code" = "code"> =
//   // React specific options
//   {
//     containerProps?: React.DetailedHTMLProps<
//       React.HTMLAttributes<HTMLDivElement>,
//       HTMLDivElement
//     >;
//     type?: EditorType;
//     onResize?: (editor: GetEditorFromType<EditorType>) => void;
//     editorRef?: MutableRefObject<GetEditorFromType<EditorType>>;
//     height?: string;
//     width?: string;
//   } & {
//     // Editor options both
//     options?: EditorType extends "code"
//       ? monaco.editor.IStandaloneEditorConstructionOptions
//       : monaco.editor.IDiffEditorConstructionOptions;
//     onChange?: (editor: GetEditorFromType<EditorType>) => void;
//     value?: string;
//     editorDidMount?: (editor: GetEditorFromType<EditorType>) => void;
//     language: monaco.editor.IStandaloneEditorConstructionOptions["language"];
//   } & (EditorType extends "diff" // Editor options exclusive-or
//       ? {
//           original: string;
//         }
//       : Record<string, unknown>);
// export default function MonacoEditor<
//   EditorType extends "diff" | "code" = "code"
// >(props: { type?: EditorType } & MonacoEditorProps<EditorType>) {
//   let type: EditorType = props.type || ("code" as EditorType);
//   const ref = React.useRef<HTMLDivElement | null>(null);
//   const ModelRef = React.useRef(
//     monaco.editor.createModel(props.value || "", props.language)
//   );
//   const ModelOriginalRef = React.useRef(
//     monaco.editor.createModel(
//       (props as unknown as MonacoEditorProps<"diff">)?.original || "",
//       props.language
//     )
//   );
//   const [editor, setEditor] =
//     React.useState<GetEditorFromType<EditorType> | null>();
//   const DiffEditor = React.useRef<monaco.editor.IStandaloneDiffEditor | null>();
//   const CodeEditor = React.useRef<monaco.editor.IStandaloneCodeEditor | null>();
//   const resizeObserver = React.useMemo(
//     () =>
//       new ResizeObserver(() => {
//         if (editor) {
//           editor.layout();
//           props.onResize?.(editor);
//         }
//       }),
//     [editor, props]
//   );

//   // React.useEffect(() => {
//   //   if (!props.value && props.value !== "") {
//   //     return;
//   //   }
//   //   CodeEditor.current?.setValue(props.value);
//   // }, []);

//   React.useEffect(() => {
//     const original = (props as unknown as MonacoEditorProps<"diff">).original;
//     if (!original && original !== "") {
//       return;
//     }
//     ModelOriginalRef.current.setValue(original);
//   }, [props]);

//   useEffectDeepCompare(() => {
//     if (props.options) {
//       editor?.updateOptions(props.options);
//     }
//   }, [props]);

//   React.useEffect(() => {
//     if (ModelRef.current && props.language) {
//       monaco.editor.setModelLanguage(ModelRef.current, props.language);
//     }
//   }, [props]);

//   React.useEffect(() => {
//     if (ModelOriginalRef.current && props.language) {
//       monaco.editor.setModelLanguage(ModelOriginalRef.current, props.language);
//     }
//   }, [props]);

//   React.useEffect(() => {
//     const codeEditorModel = ModelOriginalRef.current;
//     const original = (props as unknown as MonacoEditorProps<"diff">).original;
//     if (type === "diff" && codeEditorModel && original) {
//       codeEditorModel.setValue(original);
//     }
//   }, [props, type]);

//   useEffect(
//     function () {
//       resizeObserver.observe(ref.current as Element);
//       if (ref.current && !editor) {
//         const editor = monaco.editor[getEditorCreator(type)](ref.current, {
//           ...props.options,
//         }) as GetEditorFromType<EditorType>;
//         if (type === "code") {
//           CodeEditor.current = editor as monaco.editor.IStandaloneCodeEditor;
//           CodeEditor.current.setModel(ModelRef.current);
//         } else if (type === "diff") {
//           DiffEditor.current = editor as monaco.editor.IStandaloneDiffEditor;
//           DiffEditor.current.setModel({
//             modified: ModelRef.current,
//             original: ModelOriginalRef.current,
//           });
//         }

//         setEditor(editor);
//         props.editorDidMount?.(editor);
//         (editor as monaco.editor.IStandaloneDiffEditor).onDidUpdateDiff?.(
//           () => {
//             props.onChange?.(editor);
//           }
//         );
//         console.log(editor);
//         (
//           editor as monaco.editor.IStandaloneCodeEditor
//         )?.onDidChangeModelContent?.(() => {
//           props.onChange?.(editor);
//         });
//       }

//       const el = ref.current;

//       return () => {
//         if (el) {
//           resizeObserver.unobserve(el);
//         }
//       };
//     },
//     [editor, props, resizeObserver, type]
//   );

//   return (
//     <div
//       style={{
//         width: props?.width || "100%",
//         height: props?.height || "100%",
//       }}
//       {...props.containerProps}
//       ref={ref}
//     ></div>
//   );
// }
export default {};
