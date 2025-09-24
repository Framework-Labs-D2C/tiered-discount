import {
  DiscountClass,
  OrderDiscountSelectionStrategy,
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
  console.log(JSON.stringify(input), input);
  try {
    metafieldValue = JSON.parse(input?.discount?.metafield?.value ?? '{}');
  } catch (error) {
    console.log('Failed to parse metafield value:', error);
    return EMPTY_DISCOUNT;
  }

  const configuration = metafieldValue.tiers || [];

  console.log(
    'configuration',
    JSON.stringify({
      tiers: configuration,
    })
  );

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

  const operations = [];

  configuration.map((tier) => {
    if (tier.products.length === 0) {
      return EMPTY_DISCOUNT;
    }
    const productIds = tier.products.map((p: any) => p.id);
    eligibleItems = giftItems.filter((item) => {
      if (item.merchandise.__typename === 'ProductVariant') {
        return productIds.includes(item.merchandise.product.id);
      }
      return false;
    });
    console.log(JSON.stringify(eligibleItems), 'eligibleItems');
    // if (hasProductDiscountClass) {
    //   operations.push({
    //     productDiscountsAdd: {
    //       candidates: [
    //         {
    //           message: tier.discountMessage,
    //           targets: [
    //             {
    //               cartLine: {
    //                 id: maxCartLine.id,
    //               },
    //             },
    //           ],
    //           value: {
    //             percentage: {
    //               value: 20,
    //             },
    //           },
    //         },
    //       ],
    //       selectionStrategy: ProductDiscountSelectionStrategy.First,
    //     },
    //   });
    // }
  });

  return {
    operations,
  };
}
