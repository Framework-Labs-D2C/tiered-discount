import {
  DiscountClass,
  ProductDiscountSelectionStrategy,
  CartInput,
  CartLinesDiscountsGenerateRunResult,
} from '../generated/api';

const EMPTY_DISCOUNT: CartLinesDiscountsGenerateRunResult = {
  operations: [],
};

export function cartLinesDiscountsGenerateRun(
  input: CartInput
): CartLinesDiscountsGenerateRunResult {
  if (!input.cart.lines.length) {
    throw new Error('No cart lines found');
  }

  let metafieldValue;

  try {
    metafieldValue = JSON.parse(input?.discount?.metafield?.value ?? '{}');
  } catch (error) {
    console.log('Failed to parse metafield value:', error);
    return EMPTY_DISCOUNT;
  }

  const configuration = metafieldValue.tiers || [];

  const items = input.cart.lines;

  let giftItems: typeof items;

  let eligibleItems: typeof items = [];

  giftItems = items;

  if (giftItems.length === 0) {
    console.log('No items found in cart');
    return EMPTY_DISCOUNT;
  }

  if (
    !configuration?.some(
      (config: any) => config?.min || config?.percentage || config?.flatPrice
    )
  ) {
    return EMPTY_DISCOUNT;
  }

  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product
  );

  if (!hasProductDiscountClass) {
    return { operations: [] };
  }

  let operations = {
    productDiscountsAdd: {
      candidates: [],
      selectionStrategy: ProductDiscountSelectionStrategy.All,
    },
  };

  configuration.map((tier) => {
    if (!tier.products || tier.products.length === 0) {
      return EMPTY_DISCOUNT;
    }
    const productIds = tier.products.map((p: any) => p.id);
    eligibleItems = giftItems.filter((item) => {
      if (item.merchandise.__typename === 'ProductVariant') {
        return productIds.includes(item.merchandise.product.id);
      }
      return false;
    });

    if (eligibleItems.length > 0 && hasProductDiscountClass) {
      let thresholdMet = false;

      if (tier.tresholdType === 'amount') {
        const totalAmount = eligibleItems.reduce(
          (sum, item) => sum + parseFloat(item.cost.subtotalAmount.amount),
          0
        );
        thresholdMet = totalAmount >= (tier.amount || 0);
      } else if (tier.tresholdType === 'qty') {
        const totalQuantity = eligibleItems.reduce(
          (sum, item) => sum + item.quantity,
          0
        );
        thresholdMet = totalQuantity >= (tier.quantity || 0);
      }

      if (thresholdMet) {
        eligibleItems.forEach((item) => {
          const discountValue =
            tier.discountType === 'percentage'
              ? { percentage: { value: tier.percentage || 0 } }
              : { fixedAmount: { amount: tier.flatPrice || 0 } };

          operations.productDiscountsAdd.candidates.push({
            message: tier.discountMessage || 'Tier discount applied',
            targets: [
              {
                cartLine: {
                  id: item.id,
                  quantity: 1,
                },
              },
            ],
            value: discountValue,
          });
        });
      }
    }
  });

  return {
    operations,
  };
}
