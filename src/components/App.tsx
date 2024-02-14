import React, { useState, useEffect, useRef } from "react";
import debounce from "lodash.debounce";
import { GridResizeHandler } from "./Resizer";
import Ansi from "ansi-to-react";
import Editor, { DiffEditor, useMonaco } from "@monaco-editor/react";
import type { editor } from "monaco-editor";
import { invoke } from "@tauri-apps/api";
import themelist from "monaco-themes/themes/themelist.json";
import { colord } from "colord";
import "./style.css";

type DefaultThemes = "vs-dark" | "light";
type Themes = keyof typeof themelist | "vs-dark" | "light";

const themes = import.meta.glob(
  `../../node_modules/monaco-themes/themes/*.json`
);

const getTheme = (theme: string): Promise<editor.IStandaloneThemeData> => {
  return themes[
    `../../node_modules/monaco-themes/themes/${theme.toString()}.json`
  ]() as Promise<editor.IStandaloneThemeData>;
};

// const themeValues = Object.keys(themelist) as unknown as Themes;

const themeData = new Set<Themes>(["vs-dark", "light"] as DefaultThemes[]);

export function runScript({
  language,
  code,
  input,
}: {
  language: CommandType;
  code: string;
  input: string;
}): Promise<string> {
  // return Promise.resolve(`Called times: ${callTimes++}`);
  return invoke<string>("run_command", {
    language,
    code,
    input,
  });
}

const runCode = debounce(runScript, 200, {
  leading: true,
  trailing: true,
});

export enum CommandType {
  Node = "Node",
  Python = "Python",
  Deno = "Deno",
}

export const knownLanguages = [
  CommandType.Node,
  CommandType.Deno,
  CommandType.Python,
] as const;

export type KnownLanguages = CommandType;
export type MonacoKnownLanguages = "python" | "javascript" | "typescript";

const languageMap = new Map<KnownLanguages, MonacoKnownLanguages>([
  [CommandType.Deno, "typescript"],
  [CommandType.Node, "javascript"],
  [CommandType.Python, "python"],
]);

function getState<T>(state: T | (() => T)): T {
  return state instanceof Function ? state() : state;
}
// function getSetStateAction<T>(state: React.SetStateAction<T>, prevState: T): T {
//   return state instanceof Function ? state(prevState) : state;
// }
// type F = React.SetStateAction<number>;
type KnownOutputFormats = "diff-editor" | "ansi-html";
const outputFormats = new Set<KnownOutputFormats>(["ansi-html", "diff-editor"]);

function extractedSetter<T>(...params: Parameters<IUseLocalState<T>>) {
  const [key, initialState, { deserialize, serialize = (x: T) => "" + x }] =
    params;
  return (): T => {
    const possibleInit = localStorage.getItem(key);
    const newState = possibleInit
      ? deserialize(possibleInit)
      : getState(initialState);
    localStorage.setItem(key, serialize(newState));
    return newState;
  };
}

interface IUseLocalState<T> {
  (
    key: string,
    initialState: T | (() => T),
    {
      deserialize,
      serialize,
    }: {
      deserialize: (fromLocalStorage: string) => T;
      serialize?: (toLocalStorageValue: T) => string;
    }
  ): [T, React.Dispatch<T>];
}

/**
 *
 * @param key
 * @param initialState
 * @param param2
 * @returns []
 */
function useLocalState<T>(
  ...params: Parameters<IUseLocalState<T>>
): ReturnType<IUseLocalState<T>> {
  // The double comma after key is intentional
  const [key, , { deserialize, serialize = (x: T) => "" + x }] = params;
  const deserializeRef = useRef(deserialize);
  const serializeRef = useRef(serialize);
  const [prevState, setState] = useState(extractedSetter(...params));
  useEffect(() => {
    setState(deserializeRef.current(localStorage.getItem(key) ?? ""));
  }, [key]);
  useEffect(() => {
    localStorage.setItem(key, serializeRef.current(prevState));
  }, [key, prevState]);
  return [prevState, setState];
}

export default function App() {
  const [output, setOutput] = useState("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [language, setLanguage] = useLocalState<KnownLanguages>(
    "language",
    CommandType.Node,
    {
      deserialize: (x) => {
        switch (x) {
          case CommandType.Node:
            return CommandType.Node;
          case CommandType.Deno:
            return CommandType.Deno;
          case CommandType.Python:
            return CommandType.Python;
          default:
            return CommandType.Node;
        }
      },
      serialize: (x) => x,
    }
  );

  const [theme, setTheme] = useLocalState<Themes>("theme", "nord", {
    deserialize: (x) => x as Themes,
  });
  const [input, setInput] = useLocalState("input", "", {
    deserialize: (x) => x,
  });
  const [code, setCode] = useLocalState(`code-${language}`, "", {
    deserialize: (x) => x,
  });
  const [outputFormat, setOutputFormat] = useLocalState<KnownOutputFormats>(
    "outputFormat",
    "diff-editor",
    {
      deserialize: (x) => {
        return outputFormats.has(x as KnownOutputFormats)
          ? (x as KnownOutputFormats)
          : "diff-editor";
      },
    }
  );
  const [autoRun, setAutoRun] = useState(false);
  const [expectedOut, setExpectedOut] = useLocalState("expectedOut", "", {
    deserialize: (x) => x,
  });

  const monaco = useMonaco();

  useEffect(() => {
    (async () => {
      if (monaco && "defineTheme" in monaco.editor && !themeData.has(theme)) {
        const monacoThemeData: editor.IStandaloneThemeData = await getTheme(
          themelist[theme as Exclude<typeof theme, DefaultThemes>]
        );
        monaco.editor.defineTheme(theme, monacoThemeData);
        themeData.add(theme);
      }
      if (monaco && "setTheme" in monaco?.editor) {
        monaco?.editor.setTheme(theme);
      }
      const editor = document.getElementsByClassName("monaco-editor")[0];
      if (editor) {
        const light = colord(
          getComputedStyle(editor).backgroundColor
        ).isLight();
        console.log({
          light,
          editorColor: getComputedStyle(editor).backgroundColor,
        });
        document.body.style.setProperty(
          "--text-color",
          light ? "#000000" : "#ffffff"
        );
      }
    })();
  }, [theme, monaco, setTheme]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        runCode({
          language,
          code,
          input,
        })
          ?.then((out) => {
            setOutput(out);
          })
          .catch((err) => {
            setOutput(err);
          });
      }
    };
    window.removeEventListener("keydown", handler);
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
    };
  }, [language, code, input, outputFormat]);

  useEffect(() => {
    if (!autoRun) {
      return;
    }
    runCode({ code, input, language })
      ?.then((out) => {
        setOutput(out);
      })
      .catch((err) => {
        setOutput(err);
      });
  }, [code, input, language, outputFormat, autoRun]);

  return (
    <div className="app-script-runner">
      <div ref={editorRef} className="code-editor editor">
        <Editor
          defaultValue={code}
          theme={theme}
          language={languageMap.get(language)}
          onChange={(code) => {
            setCode(code ?? "");
          }}
        />
        <GridResizeHandler
          dir="ns"
          align="bottom"
          minLength={5}
          unitLength="vw/vh"
          className="status-bar input-editor-statusbar unselectable"
        >
          <div>Code</div>
          <div className="controls">
            <div>
              <label htmlFor="language-select">Language: </label>
              <select
                id="language-select"
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                defaultValue={language}
                onChange={(e) => {
                  setLanguage(e.target.value as KnownLanguages);
                }}
              >
                <option value={CommandType.Node}>Javascript (Node.js)</option>{" "}
                <option value={CommandType.Python}>Python</option>{" "}
                <option value={CommandType.Deno}>Deno (TypeScript)</option>
              </select>
            </div>
            <div>
              <label htmlFor="theme-select">Theme: </label>
              <select
                id="theme-select"
                defaultValue={theme}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  console.log(e.target.value);
                  setTheme(e.target.value as Themes);
                  return false;
                }}
              >
                <option key="light" value={"light"}>
                  Default Light
                </option>
                <option key="vs-dark" value={"vs-dark"}>
                  Default Dark
                </option>
                {Object.entries(themelist).map(([theme, name]) => (
                  <option key={theme} value={theme}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="output">Output: </label>
              <select
                id="output"
                title="Output format"
                value={outputFormat}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onChange={(e) => {
                  setOutputFormat(e.target.value as KnownOutputFormats);
                }}
              >
                {[...outputFormats].map((x) => (
                  <option value={x} key={x}>
                    {x}
                  </option>
                ))}
              </select>
            </div>
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
              }}
            >
              <button
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={() => {
                  runCode({
                    language,
                    code,
                    input,
                  })
                    ?.then((out) => {
                      setOutput(out);
                    })
                    .catch((err) => {
                      setOutput(err);
                    });
                }}
              >
                run
              </button>
              <label htmlFor="auto-run">Auto Run: </label>
              <input
                id="auto-run"
                type="checkbox"
                defaultChecked={autoRun}
                onChange={(e) => {
                  setAutoRun(e.target.checked);
                }}
              />
            </div>
          </div>
        </GridResizeHandler>
      </div>
      <div className="input-editor editor">
        <div className="status-bar input-editor-statusbar unselectable">
          Input File
        </div>
        <Editor
          theme={theme}
          defaultValue={input}
          language="plaintext"
          onChange={(editor) => {
            setInput(editor ?? "");
          }}
        />
        <GridResizeHandler
          className="right-aligned-resizer"
          dir="ew"
          align="right"
          minLength={5}
          unitLength={"vw/vh"}
        />
      </div>
      <div className="output-editor editor">
        <div className="status-bar output-editor-statusbar  unselectable">
          {outputFormat === "diff-editor" && "Actual/Expected"} Output
        </div>
        {outputFormat === "diff-editor" ? (
          <DiffEditor
            theme={theme}
            language="plaintext"
            original={output}
            onMount={(monaco) => {
              const changedModel = monaco.onDidChangeModel(() => {
                setExpectedOut(monaco.getModel()?.modified.getValue() ?? "");
              });

              monaco.getModel()?.modified.setValue(expectedOut);

              return () => {
                changedModel.dispose();
              };
            }}
          />
        ) : outputFormat === "ansi-html" ? (
          <div
            className="monaco-editor"
            style={{
              padding: "1em",
              height: "100%",
              maxHeight: "100%",
              boxSizing: "border-box",
              fontSize: "0.75em",
              wordWrap: "break-word",
              overflowY: "scroll",
            }}
          >
            {/* prettier-ignore */}
            <pre><Ansi>{output}</Ansi></pre>
          </div>
        ) : null}
      </div>
    </div>
  );
}
