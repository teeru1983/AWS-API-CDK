exports.handler = async (event) => {

  console.log(
    'Authorizer event:',
    JSON.stringify(event)
  );

  /*
   * TOKEN-type authorizer events carry the identity
   * source directly as `authorizationToken`, not as
   * an HTTP `headers` object.
   */
  const authorization =
    event.authorizationToken;

  if (!authorization) {

    return {
      principalId: 'anonymous',

      policyDocument: {
        Version: '2012-10-17',

        Statement: [
          {
            Action: 'execute-api:Invoke',

            Effect: 'Deny',

            Resource:
              event.methodArn
          }
        ]
      }
    };
  }

  /*
   * Lesson 15:
   * Accept any Bearer token.
   *
   * Later we'll validate
   * a real JWT.
   */
  if (
    authorization.startsWith(
      'Bearer '
    )
  ) {

    return {
      principalId: 'demo-user',

      policyDocument: {
        Version: '2012-10-17',

        Statement: [
          {
            Action: 'execute-api:Invoke',

            Effect: 'Allow',

            Resource:
              event.methodArn
          }
        ]
      },

      context: {
        userId: 'demo-user'
      }
    };
  }

  return {
    principalId: 'unknown',

    policyDocument: {
      Version: '2012-10-17',

      Statement: [
        {
          Action: 'execute-api:Invoke',

          Effect: 'Deny',

          Resource:
            event.methodArn
        }
      ]
    }
  };
};