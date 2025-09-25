
import {
  reactExtension,
  useApi,
  BlockStack,
  FunctionSettings,
  Section,
  Text,
  Form,
  NumberField,
  Box,
  InlineStack,
  Heading,
  TextField,
  Button,
  Icon,
  Divider,
  Banner,
  Select,
  Link,
  MoneyField,
  ChoiceList
} from "@shopify/ui-extensions-react/admin";
import { useState, useMemo } from "react";

// #region =-=-=-= CONSTANTS =-=-=-=
const TARGET = "admin.discount-details.function-settings.render";
const METAFIELD_NAMESPACE = "$app:platter-tier-discounts";
const METAFIELD_KEY = "function-configuration";
// #endregion =-=-=-= END CONSTANTS =-=-=-=-=

export default reactExtension(TARGET, async (api) => {
  const existingDefinition = await getMetafieldDefinition(api.query);
  if (!existingDefinition) {
    const metafieldDefinition = await createMetafieldDefinition(api.query); 
    if (!metafieldDefinition) {
      throw new Error("Failed to create metafield definition");
    }
  }
  return <App />;
});

function App() {
  const {
    i18n,
    applyExtensionMetafieldChange,
    tiers,
    addTier,
    updateTier,
    removeTier,
    resetForm,
    validationErrors,
  } = useExtensionData();

  const hasValidationErrors = validationErrors.some(v => v.errors.length > 0);

  const handleSave = async () => {
    if (hasValidationErrors) {
      const errorMessages = validationErrors
        .flatMap(v => v.errors)
        .join('; ');
      throw new Error(`Please fix validation errors: ${errorMessages}`);
    }
    await applyExtensionMetafieldChange();
  };

  return (
      <FunctionSettings onSave={handleSave}>
        <Heading size={3}>{i18n.translate("title")}</Heading>
        <Text>{i18n.translate("description")}</Text>
        <Form onReset={resetForm} onSubmit={handleSave}>

          {hasValidationErrors && (
            <Banner tone="critical">
              <BlockStack gap="base">
                <Text>{i18n.translate("validation.fixErrors")}</Text>
              </BlockStack>
            </Banner>
          )}

          <Divider />

          <Section>
            <BlockStack gap="base">

              <Section>
                <BlockStack gap="base" paddingBlockEnd="base" paddingBlockStart="base">
                  <Heading size={4}>{i18n.translate("discountTiers.title")}</Heading>
                  <BlockStack gap="base">
                    {tiers.map((tier, index) => (
                      <BundleTierRow
                        key={index}
                        tier={tier}
                        index={index}
                        onUpdate={updateTier}
                        onRemove={removeTier}
                        validation={validationErrors[index]}
                        i18n={i18n}
                      />
                    ))}
                    <Button onClick={addTier} disabled={hasValidationErrors}>
                      {i18n.translate("discountTiers.addTier")}
                    </Button>
                  </BlockStack>
                </BlockStack>
              </Section>
            </BlockStack>
          </Section>
        </Form>
      </FunctionSettings>
  );
}

// #region =-=-=-= CHILDREN COMPONENTS =-=-=-=

function BundleTierRow({ tier, index, onUpdate, onRemove, validation, i18n }) {
  const hasError = validation?.errors?.length > 0;
  const isFlat = tier.discountType === 'flat';
  const isQty = tier.tresholdType === 'qty';

  return (
    <Box>
      <BlockStack gap="base">
        <BlockStack gap="base">
          <BlockStack gap="base">
            <ChoiceList
              choices={[
                {label: 'Minimum quantity of items', id: 'qty'},
                {label: 'Minimum purchase amount', id: 'amount'}
              ]}
              value={tier.tresholdType}
              onChange={(value) => onUpdate(index, 'tresholdType', value)}
            />
          
          </BlockStack>

          <BlockStack gap="base">
            {isQty ? (
              <Box minInlineSize={120}>
                <NumberField
                  label={i18n.translate("discountTiers.quantity")}
                  name={`tier-${index}-quantity`}
                  value={tier.quantity}
                  onChange={(value) => onUpdate(index, 'quantity', Number(value))}
                  min={1}
                  error={validation?.quantityError}
                />
              </Box>
            ) : (
              <Box minInlineSize={120}>
                <MoneyField
                  label={i18n.translate("discountTiers.amount")}
                  name={`tier-${index}-amount`}
                  value={tier.amount}
                  onChange={(value) => onUpdate(index, 'amount', Number(value))}
                  min={0}
                />
              </Box>
            )}

            <BlockStack gap="base">
              <Text>{i18n.translate("discountTiers.products")}</Text>
              <InlineStack gap="base" blockAlignment="end">
                <Button onClick={() => {tier.addProduct(tier)}}>{i18n.translate("productTargeting.selectProducts")}</Button>
              </InlineStack>
              {tier.products && tier.products.map((product) => (
                <InlineStack key={product.id} blockAlignment="center" inlineAlignment="space-between">
                  <Link href={`shopify://admin/products/${product.id.split("/").pop()}`} target="_blank">
                    {product.title}
                  </Link>
                  <Button variant="tertiary" onClick={() => tier.removeProduct(product.id, tier)}>
                    <Icon name="CircleCancelMajor" />
                  </Button>
                </InlineStack>
              ))}
            </BlockStack>
            

            <Box minInlineSize={120}>
              <Select
                label={i18n.translate("discountTiers.discountType")}
                name={`tier-${index}-type`}
                value={tier.discountType || 'percentage'}
                onChange={(value) => onUpdate(index, 'discountType', value)}
                options={[
                  { label: i18n.translate("discountTiers.percentage"), value: "percentage" },
                  { label: i18n.translate("discountTiers.flatPrice"), value: "flat" }
                ]}
              />
            </Box>

            <Box minInlineSize={120}>
              {isFlat ? (
                <MoneyField
                  label={i18n.translate("discountTiers.totalPrice")}
                  name={`tier-${index}-flatPrice`}
                  value={tier.flatPrice || 0}
                  onChange={(value) => onUpdate(index, 'flatPrice', Number(value))}
                  min={0}
                  error={validation?.flatPriceError}
                />
              ) : (
                <NumberField
                  label={i18n.translate("discountTiers.discountPercent")}
                  name={`tier-${index}-percentage`}
                  value={tier.percentage}
                  onChange={(value) => onUpdate(index, 'percentage', Number(value))}
                  suffix="%"
                  min={0}
                  max={100}
                  error={validation?.percentageError}
                />
              )}
            </Box>
          </BlockStack>

          <BlockStack gap="base" paddingBlockEnd="base" paddingBlockStart="base">
            <Heading size={4}>{i18n.translate("discountMessage.title")}</Heading>
            <TextField
              label={i18n.translate("discountMessage.description")}
              name="discountMessage"
              value={tier.discountMessage}
               onChange={(value) => onUpdate(index, 'discountMessage', value)}
              placeholder={i18n.translate("discountMessage.placeholder")}
            />
          </BlockStack>

          {index > 0 && (
            <Button variant="tertiary" onClick={() => onRemove(index)}>
              <Icon name="CircleCancelMajor" />
            </Button>
          )}
        </BlockStack>

        {/* Errors */}
        {hasError && (
          <Banner tone="critical">
            <BlockStack gap="base">
              {validation.errors.map((error, i) => (
                <Text key={i}>{error}</Text>
              ))}
            </BlockStack>
          </Banner>
        )}

        <Divider />
      </BlockStack>
    </Box>
  );
}

// #endregion =-=-=-= END CHILDREN COMPONENTS =-=-=-=-=

// #region =-=-=-= UTILITY FUNCTIONS =-=-=-=

function useExtensionData() {
  const { applyMetafieldChange, data, resourcePicker, i18n, query } = useApi(TARGET);

  const metafieldConfig = useMemo(
    () =>
      parseMetafield(
        data?.metafields.find(
          (metafield) => metafield.key === "function-configuration"
        )?.value
      ),
    [data?.metafields]
  );

   const addProduct = async (tier) => {
    const selection = await resourcePicker({
      type: "product",
      multiple: true,
      selectionIds: tier.products ? tier.products.map(({ id }) => ({ id })) : '',
    });
    if (selection) {
      tier.products = selection;
    }
  };

  const removeProduct = (id, tier) => {
    tier.products = tier.products.filter(product => product.id !== id);
  };

  if (metafieldConfig.tiers){
    metafieldConfig.tiers.map((tier) => {
      tier.addProduct = addProduct;
      tier.removeProduct = removeProduct;
    })
  }

  const [tiers, setTiers] = useState(metafieldConfig.tiers || [{ tresholdType: 'qty', quantity: 0, amount: 0, flatPrice: 0, percentage: 0, discountType: 'percentage', discountMessage: '', products: [], addProduct: addProduct, removeProduct: removeProduct }]);
  const [initialTiers, setInitialTiers] = useState(metafieldConfig.tiers || [{ tresholdType: 'qty', quantity: 0, amount: 0, flatPrice: 0, percentage: 0, discountType: 'percentage', discountMessage: '', products: [], addProduct: addProduct, removeProduct: removeProduct }]);

  const validationErrors = useMemo(() => {
    return tiers.map((tier, index) => {
      const errors = [];
  

      return { errors };
    });
  }, [tiers, i18n]);

  const addTier = () => {
    const lastTier = tiers[tiers.length - 1];
    setTiers([...tiers, {
      tresholdType: lastTier ? lastTier.tresholdType : 'qty',
      quantity: 0,
      amount: 0,
      percentage: 0,
      flatPrice: 0,
      discountType: 'percentage',
      addProduct: addProduct,
      removeProduct: removeProduct,
      discountMessage: '',
      products: []
    }]);
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setTiers(newTiers);
  };

  const removeTier = (index) => {
    if (tiers.length > 1) {
      setTiers(tiers.filter((_, i) => i !== index));
    }
  };

 

  const applyExtensionMetafieldChange = async () => {
    try {
      const hasValidationErrors = validationErrors.some(v => v.errors.length > 0);
      if (hasValidationErrors) {
        console.error('Cannot save: validation errors exist');
        return;
      }

       const configData = {
        tiers: tiers.map(tier => {
          const { addProduct, removeProduct, products, ...tierData } = tier;
          return {
            ...tierData,
            products: products ? products.map(product => ({ 
              id: product.id, 
              title: product.title,
            })) : []
          };
        })
      };

      const result = await applyMetafieldChange({
        type: "updateMetafield",
        namespace: METAFIELD_NAMESPACE,
        key: METAFIELD_KEY,
        value: JSON.stringify(configData),
        valueType: "json",
      });

      if (result.type === 'success') {
        console.log('Metafield saved successfully');
        setInitialTiers(tiers);
      } else {
        console.error('Metafield save failed:', result);
      }
    } catch (error) {
      console.error('Error saving metafield:', error);
    }
  };

  const resetForm = () => {
    setTiers(initialTiers);
  };

  return {
    i18n,
    applyExtensionMetafieldChange,
    tiers,
    addTier,
    updateTier,
    removeTier,
    resetForm,
    validationErrors,
    addProduct,
    removeProduct,
  };
}

function parseMetafield(value) {
  const DEFAULT_CONFIG = {
    tiers: [{ tresholdType: 'qty', quantity: 0, amount: 0, flatPrice: 0, percentage: 0, discountType: 'percentage', discountMessage: 'get free product', products: [] }],
  }

  try {
    const parsed = JSON.parse(value || "{}");

    if (parsed.tiers && Array.isArray(parsed.tiers)) {
      return {
        tiers: parsed.tiers.map(tier => {
          const { productIds, ...tierData } = tier;
          return {
            ...tierData,
            discountType: tier.discountType || 'percentage',
            flatPrice: tier.flatPrice || 0,
            products: tier.products ? tier.products.map(product => ({ 
              id: product.id || product, 
              title: product.title || `Product ${(product.id || product).split('/').pop()}`,
            })) : []
          };
        }),
      };
    }

    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].tresholdType !== undefined) {
      return {
        tiers: parsed.map(tier => ({
          ...tier,
          discountType: 'percentage',
          flatPrice: 0
        })),
      };
    }

    return DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

// #endregion =-=-=-= END UTILITY FUNCTIONS =-=-=-=-=

// #region =-=-=-= METAFIELD FUNCTIONS =-=-=-=
async function getMetafieldDefinition(adminApiQuery) {
  const query = `#graphql
      query GetMetafieldDefinition {
        metafieldDefinitions(first: 1, ownerType: DISCOUNT, namespace: "${METAFIELD_NAMESPACE}", key: "${METAFIELD_KEY}") {
          nodes {
            id
          }
        }
      }
    `;

  const result = await adminApiQuery(query);

  return result?.data?.metafieldDefinitions?.nodes?.[0];
}

async function createMetafieldDefinition(adminApiQuery) {
  const definition = {
    access: {
      admin: "MERCHANT_READ_WRITE",
    },
    key: METAFIELD_KEY,
    name: "Platter tier Discounts Configuration",
    namespace: METAFIELD_NAMESPACE,
    ownerType: "DISCOUNT",
    type: "json",
  };

  const query = `#graphql
      mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
        metafieldDefinitionCreate(definition: $definition) {
          createdDefinition {
              id
            }
          }
        }
    `;

  const variables = { definition };
  const result = await adminApiQuery(query, { variables });

  return result?.data?.metafieldDefinitionCreate?.createdDefinition;
}
// #endregion =-=-=-= END METAFIELD FUNCTIONS =-=-=-=-=