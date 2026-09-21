export async function GET(){
  return Response.json({
    service:"courseforge-marketplace",
    status:"ok",
    architecture:"marketplace-commerce",
    entitlementModel:"order-entitlement-enrollment"
  });
}
