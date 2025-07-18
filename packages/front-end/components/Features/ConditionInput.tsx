/* eslint-disable react-hooks/exhaustive-deps */

import React, { useState, useEffect } from "react";
import { some } from "lodash";
import {
  FaExclamationCircle,
  FaMinusCircle,
  FaPlusCircle,
} from "react-icons/fa";
import { RxLoop } from "react-icons/rx";
import clsx from "clsx";
import format from "date-fns/format";
import {
  condToJson,
  jsonToConds,
  useAttributeMap,
  useAttributeSchema,
  getDefaultOperator,
} from "@/services/features";
import { useDefinitions } from "@/services/DefinitionsContext";
import Field from "@/components/Forms/Field";
import SelectField from "@/components/Forms/SelectField";
import CodeTextArea from "@/components/Forms/CodeTextArea";
import StringArrayField from "@/components/Forms/StringArrayField";
import CountrySelector, {
  ALL_COUNTRY_CODES,
} from "@/components/Forms/CountrySelector";
import MultiSelectField from "@/components/Forms/MultiSelectField";
import DatePicker from "@/components/DatePicker";
import Callout from "@/components/Radix/Callout";
import styles from "./ConditionInput.module.scss";

interface Props {
  defaultValue: string;
  onChange: (value: string) => void;
  project: string;
  labelClassName?: string;
  emptyText?: string;
  title?: string;
  require?: boolean;
}

export default function ConditionInput(props: Props) {
  const { savedGroups } = useDefinitions();

  const attributes = useAttributeMap(props.project);

  const title = props.title || "Target by Attributes";
  const emptyText = props.emptyText || "Applied to everyone by default.";

  const [advanced, setAdvanced] = useState(
    () => jsonToConds(props.defaultValue, attributes) === null
  );
  const [simpleAllowed, setSimpleAllowed] = useState(false);
  const [value, setValue] = useState(props.defaultValue);
  const [conds, setConds] = useState(
    () => jsonToConds(props.defaultValue, attributes) || []
  );
  const [rawTextMode, setRawTextMode] = useState(false);

  const attributeSchema = useAttributeSchema(false, props.project);

  const usingDisabledEqualityAttributes = conds.some(
    (cond) => !!attributes.get(cond.field)?.disableEqualityConditions
  );

  useEffect(() => {
    if (advanced) return;
    setValue(condToJson(conds, attributes));
  }, [advanced, conds]);

  useEffect(() => {
    props.onChange(value);
    setSimpleAllowed(jsonToConds(value, attributes) !== null);
  }, [value, attributes]);

  const savedGroupOperators = [
    {
      label: "is in the saved group",
      value: "$inGroup",
    },
    {
      label: "is not in the saved group",
      value: "$notInGroup",
    },
  ];

  const listOperators = ["$in", "$nin"];

  if (advanced || !attributes.size || !simpleAllowed) {
    const hasSecureAttributes = some(
      [...attributes].filter(([_, a]) =>
        ["secureString", "secureString[]"].includes(a.datatype)
      )
    );
    return (
      <div className="form-group my-4">
        <label className={props.labelClassName || ""}>{title}</label>
        <div className="appbox bg-light px-3 py-3">
          <CodeTextArea
            labelClassName={props.labelClassName}
            language="json"
            value={value}
            setValue={setValue}
            helpText={
              <>
                <div className="d-flex">
                  <div>JSON format using MongoDB query syntax.</div>
                  {simpleAllowed && attributes.size && (
                    <div className="ml-auto">
                      <span
                        className="link-purple cursor-pointer"
                        onClick={(e) => {
                          e.preventDefault();
                          const newConds = jsonToConds(value, attributes);
                          // TODO: show error
                          if (newConds === null) return;
                          setConds(newConds);
                          setAdvanced(false);
                        }}
                      >
                        <RxLoop /> Simple mode
                      </span>
                    </div>
                  )}
                </div>
                {hasSecureAttributes && (
                  <div className="mt-1 text-warning-orange">
                    <FaExclamationCircle /> Secure attribute hashing not
                    guaranteed to work for complicated rules
                  </div>
                )}
              </>
            }
          />
        </div>
      </div>
    );
  }

  if (!conds.length) {
    return (
      <div className="form-group my-4">
        <label className={props.labelClassName || ""}>{title}</label>
        <div>
          <div className="font-italic text-muted mr-3">{emptyText}</div>
          <div
            className="d-inline-block ml-1 mt-2 link-purple font-weight-bold cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              const prop = attributeSchema[0];
              setConds([
                {
                  field: prop?.property || "",
                  operator:
                    prop?.datatype === "boolean"
                      ? "$true"
                      : prop?.disableEqualityConditions
                      ? "$regex"
                      : "$eq",
                  value: "",
                },
              ]);
            }}
          >
            <FaPlusCircle className="mr-1" />
            Add attribute targeting
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="form-group my-4">
      <label className={props.labelClassName || ""}>{title}</label>
      <div className="appbox bg-light px-3 pb-3">
        <ul className={styles.conditionslist}>
          {conds.map(({ field, operator, value }, i) => {
            const attribute = attributes.get(field);

            if (!attribute) {
              console.error("Attribute not found in attribute Map.");
              return;
            }

            const savedGroupOptions = savedGroups
              // First, limit to groups with the correct attribute
              .filter((g) => g.type === "list" && g.attributeKey === field)
              // Filter by project
              .filter((group) => {
                return (
                  !props.project ||
                  !group.projects?.length ||
                  group.projects.includes(props.project)
                );
              })
              // Then, transform into the select option format
              .map((g) => ({ label: g.groupName, value: g.id }));

            const handleCondsChange = (value: string, name: string) => {
              const newConds = [...conds];
              newConds[i] = { ...newConds[i] };
              newConds[i][name] = value;
              setConds(newConds);
            };

            const handleFieldChange = (
              e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>
            ) => {
              const name = e.target.name;
              const value: string | number = e.target.value;

              handleCondsChange(value, name);
            };

            const handleListChange = (values: string[]) => {
              const name = "value";
              const value: string | number = values.join(",");
              handleCondsChange(value, name);
            };

            let operatorOptions =
              attribute.datatype === "boolean"
                ? [
                    { label: "is true", value: "$true" },
                    { label: "is false", value: "$false" },
                    { label: "is not NULL", value: "$exists" },
                    { label: "is NULL", value: "$notExists" },
                  ]
                : attribute.array
                ? [
                    { label: "includes", value: "$includes" },
                    { label: "does not include", value: "$notIncludes" },
                    { label: "is empty", value: "$empty" },
                    { label: "is not empty", value: "$notEmpty" },
                    { label: "is not NULL", value: "$exists" },
                    { label: "is NULL", value: "$notExists" },
                  ]
                : attribute.enum?.length || 0 > 0
                ? [
                    { label: "is equal to", value: "$eq" },
                    { label: "is not equal to", value: "$ne" },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "is not NULL", value: "$exists" },
                    { label: "is NULL", value: "$notExists" },
                  ]
                : attribute.datatype === "string"
                ? [
                    {
                      label: "is equal to",
                      value: attribute.format === "version" ? "$veq" : "$eq",
                    },
                    {
                      label: "is not equal to",
                      value: attribute.format === "version" ? "$vne" : "$ne",
                    },
                    { label: "matches regex", value: "$regex" },
                    { label: "does not match regex", value: "$notRegex" },
                    {
                      label:
                        attribute.format === "date"
                          ? "is after"
                          : "is greater than",
                      value: attribute.format === "version" ? "$vgt" : "$gt",
                    },
                    {
                      label:
                        attribute.format === "date"
                          ? "is after or on"
                          : "is greater than or equal to",
                      value: attribute.format === "version" ? "$vgte" : "$gte",
                    },
                    {
                      label:
                        attribute.format === "date"
                          ? "is before"
                          : "is less than",
                      value: attribute.format === "version" ? "$vlt" : "$lt",
                    },
                    {
                      label:
                        attribute.format === "date"
                          ? "is before or on"
                          : "is less than or equal to",
                      value: attribute.format === "version" ? "$vlte" : "$lte",
                    },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "is not NULL", value: "$exists" },
                    { label: "is NULL", value: "$notExists" },
                    ...(savedGroupOptions.length > 0
                      ? savedGroupOperators
                      : []),
                  ]
                : attribute.datatype === "secureString"
                ? [
                    { label: "is equal to", value: "$eq" },
                    { label: "is not equal to", value: "$ne" },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "is not NULL", value: "$exists" },
                    { label: "is NULL", value: "$notExists" },
                    ...(savedGroupOptions.length > 0
                      ? savedGroupOperators
                      : []),
                  ]
                : attribute.datatype === "number"
                ? [
                    { label: "is equal to", value: "$eq" },
                    { label: "is not equal to", value: "$ne" },
                    { label: "is greater than", value: "$gt" },
                    { label: "is greater than or equal to", value: "$gte" },
                    { label: "is less than", value: "$lt" },
                    { label: "is less than or equal to", value: "$lte" },
                    { label: "is in the list", value: "$in" },
                    { label: "is not in the list", value: "$nin" },
                    { label: "is not NULL", value: "$exists" },
                    { label: "is NULL", value: "$notExists" },
                    ...(savedGroupOptions.length > 0
                      ? savedGroupOperators
                      : []),
                  ]
                : [];

            if (attribute.disableEqualityConditions) {
              // Remove equality operators if the attribute has them disabled
              operatorOptions = operatorOptions.filter(
                (o) => !["$eq", "$ne", "$in", "$nin"].includes(o.value)
              );
            }

            let displayType:
              | "select-only"
              | "array-field"
              | "enum"
              | "number"
              | "string"
              | "isoCountryCode"
              | null = null;
            if (
              [
                "$exists",
                "$notExists",
                "$true",
                "$false",
                "$empty",
                "$notEmpty",
              ].includes(operator)
            ) {
              displayType = "select-only";
            } else if (attribute.enum === ALL_COUNTRY_CODES) {
              displayType = "isoCountryCode";
            } else if (attribute.enum.length) {
              displayType = "enum";
            } else if (listOperators.includes(operator)) {
              displayType = "array-field";
            } else if (attribute.datatype === "number") {
              displayType = "number";
            } else if (
              ["string", "secureString"].includes(attribute.datatype)
            ) {
              displayType = "string";
            }
            const hasExtraWhitespace =
              displayType === "string" && value !== value.trim();

            return (
              <li key={i} className={styles.listitem}>
                <div className={`row ${styles.listrow}`}>
                  {i > 0 ? (
                    <span className={`${styles.and} mr-2`}>AND</span>
                  ) : (
                    <span className={`${styles.and} mr-2`}>IF</span>
                  )}
                  <div className="col-sm-12 col-md mb-2">
                    <SelectField
                      value={field}
                      options={attributeSchema.map((s) => ({
                        label: s.property,
                        value: s.property,
                        tooltip: s.description || "",
                      }))}
                      formatOptionLabel={(o) => (
                        <span title={o.tooltip}>{o.label}</span>
                      )}
                      name="field"
                      className={styles.firstselect}
                      onChange={(value) => {
                        const newConds = [...conds];
                        newConds[i] = { ...newConds[i] };
                        newConds[i]["field"] = value;

                        const newAttribute = attributes.get(value);
                        const hasAttrChanged =
                          newAttribute?.datatype !== attribute.datatype ||
                          newAttribute?.array !== attribute.array ||
                          !!newAttribute.disableEqualityConditions !==
                            !!attribute.disableEqualityConditions;

                        if (hasAttrChanged && newAttribute) {
                          newConds[i]["operator"] = getDefaultOperator(
                            newAttribute
                          );
                          newConds[i]["value"] = newConds[i]["value"] || "";
                        }
                        setConds(newConds);
                      }}
                    />
                  </div>
                  <div className="col-sm-12 col-md mb-2">
                    <SelectField
                      value={operator}
                      name="operator"
                      options={operatorOptions}
                      sort={false}
                      onChange={(v) => {
                        handleCondsChange(v, "operator");
                      }}
                    />
                  </div>
                  {displayType === "select-only" ? (
                    ""
                  ) : ["$inGroup", "$notInGroup"].includes(operator) &&
                    savedGroupOptions.length > 0 ? (
                    <SelectField
                      options={savedGroupOptions}
                      value={value}
                      onChange={(v) => {
                        handleCondsChange(v, "value");
                      }}
                      name="value"
                      initialOption="Choose group..."
                      containerClassName="col-sm-12 col-md mb-2"
                      required
                    />
                  ) : displayType === "array-field" ? (
                    <div className="d-flex align-items-end flex-column col-sm-12 col-md mb-1">
                      {rawTextMode ? (
                        <Field
                          textarea
                          value={value}
                          onChange={handleFieldChange}
                          name="value"
                          minRows={1}
                          className={styles.matchingInput}
                          helpText={
                            <span
                              className="position-relative"
                              style={{ top: -5 }}
                            >
                              separate values by comma
                            </span>
                          }
                          required
                        />
                      ) : (
                        <StringArrayField
                          containerClassName="w-100"
                          value={value ? value.trim().split(",") : []}
                          onChange={handleListChange}
                          placeholder="Enter some values..."
                          delimiters={["Enter", "Tab"]}
                          required
                        />
                      )}
                      <span
                        className="link-purple cursor-pointer"
                        style={{ fontSize: "0.8em" }}
                        onClick={(e) => {
                          e.preventDefault();
                          setRawTextMode((prev) => !prev);
                        }}
                      >
                        Switch to {rawTextMode ? "token" : "raw text"} mode
                      </span>
                    </div>
                  ) : displayType === "isoCountryCode" ? (
                    listOperators.includes(operator) ? (
                      <CountrySelector
                        selectAmount="multi"
                        displayFlags={true}
                        value={
                          value ? value.split(",").map((val) => val.trim()) : []
                        }
                        onChange={handleListChange}
                      />
                    ) : (
                      <CountrySelector
                        selectAmount="single"
                        displayFlags={true}
                        value={value}
                        onChange={(v) => {
                          handleCondsChange(v, "value");
                        }}
                      />
                    )
                  ) : displayType === "enum" ? (
                    listOperators.includes(operator) ? (
                      <MultiSelectField
                        options={attribute.enum.map((v) => ({
                          label: v,
                          value: v,
                        }))}
                        value={
                          value ? value.split(",").map((val) => val.trim()) : []
                        }
                        onChange={handleListChange}
                        name="value"
                        containerClassName="col-sm-12 col-md mb-2"
                        required
                      />
                    ) : (
                      <SelectField
                        options={attribute.enum.map((v) => ({
                          label: v,
                          value: v,
                        }))}
                        value={value}
                        onChange={(v) => {
                          handleCondsChange(v, "value");
                        }}
                        name="value"
                        initialOption="Choose One..."
                        containerClassName="col-sm-12 col-md mb-2"
                        required
                      />
                    )
                  ) : displayType === "number" ? (
                    <Field
                      type="number"
                      step="any"
                      value={value}
                      onChange={handleFieldChange}
                      name="value"
                      className={styles.matchingInput}
                      containerClassName="col-sm-12 col-md mb-2"
                      required
                    />
                  ) : displayType === "string" ? (
                    <>
                      {attribute.format === "date" &&
                      !["$regex", "$notRegex"].includes(operator) ? (
                        <DatePicker
                          date={value}
                          setDate={(v) => {
                            handleCondsChange(
                              v ? format(v, "yyyy-MM-dd'T'HH:mm") : "",
                              "value"
                            );
                          }}
                          inputWidth={180}
                          containerClassName="col-sm-12 col-md mb-2"
                        />
                      ) : (
                        <Field
                          value={value}
                          onChange={handleFieldChange}
                          name="value"
                          className={styles.matchingInput}
                          containerClassName={clsx("col-sm-12 col-md mb-2", {
                            error: hasExtraWhitespace,
                          })}
                          helpText={
                            hasExtraWhitespace ? (
                              <small className="text-danger">
                                Extra whitespace detected
                              </small>
                            ) : undefined
                          }
                          required
                        />
                      )}
                    </>
                  ) : (
                    ""
                  )}
                  {(conds.length > 1 || !props.require) && (
                    <div className="col-md-auto col-sm-12">
                      <button
                        className="btn btn-link text-danger float-right"
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          const newConds = [...conds];
                          newConds.splice(i, 1);
                          setConds(newConds);
                        }}
                      >
                        <FaMinusCircle className="mr-1" />
                        remove
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="d-flex align-items-center">
          {attributeSchema.length > 0 && (
            <span
              className="link-purple font-weight-bold cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                const prop = attributeSchema[0];
                setConds([
                  ...conds,
                  {
                    field: prop?.property || "",
                    operator: prop?.datatype === "boolean" ? "$true" : "$eq",
                    value: "",
                  },
                ]);
              }}
            >
              <FaPlusCircle className="mr-1" />
              Add another condition
            </span>
          )}
          <span
            className="ml-auto link-purple cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              setAdvanced(true);
            }}
          >
            <RxLoop /> Advanced mode
          </span>
        </div>
        {usingDisabledEqualityAttributes && (
          <Callout status="warning" mt="4">
            Be careful not to include Personally Identifiable Information (PII)
            in your targeting conditions.
          </Callout>
        )}
      </div>
    </div>
  );
}
