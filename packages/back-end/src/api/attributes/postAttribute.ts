import { PostAttributeResponse } from "../../../types/openapi";
import { createApiRequestHandler } from "../../util/handler";
import { postAttributeValidator } from "../../validators/openapi";
import { updateOrganization } from "../../models/OrganizationModel";
import { OrganizationInterface } from "../../../types/organization";
import { auditDetailsCreate } from "../../services/audit";
import { validatePayload } from "./validations";

export const postAttribute = createApiRequestHandler(postAttributeValidator)(
  async (req): Promise<PostAttributeResponse> => {
    const attribute = {
      ...req.body,
      ...(await validatePayload(req.context, req.body)),
    };

    const org = req.context.org;

    if (
      org.settings?.attributeSchema?.some(
        (attr) => attr.property === attribute.property
      )
    ) {
      throw Error(
        `An attribute with property ${attribute.property} already exists!`
      );
    }

    if (!req.context.permissions.canCreateAttribute(attribute))
      req.context.permissions.throwPermissionError();

    const updates: Partial<OrganizationInterface> = {
      settings: {
        ...org.settings,
        attributeSchema: [...(org.settings?.attributeSchema || []), attribute],
      },
    };

    await updateOrganization(org.id, updates);

    await req.audit({
      event: "attribute.create",
      entity: {
        object: "attribute",
        id: attribute.property,
      },
      details: auditDetailsCreate(attribute),
    });

    return {
      attribute,
    };
  }
);